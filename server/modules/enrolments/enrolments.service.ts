import { db } from '@server/db/connection'
import { enrolments, programmes } from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import { recordAudit } from '@server/modules/audit/audit.service'
import {
  loadLearnerProfile,
  resolveForProfile,
  toRuleProfile,
} from '@server/modules/paths/paths.service'
import type { ProgrammeCode } from '@shared/constants'
import { and, asc, eq } from 'drizzle-orm'

type Executor = Pick<typeof db, 'select' | 'insert' | 'update'>

/** The signed-in learner's enrolments, for the programme switcher (brief §5). */
export async function listMine(learnerId: string) {
  const profile = await loadLearnerProfile(db, learnerId)
  const rows = await db
    .select({
      id: enrolments.id,
      programme: programmes.code,
      programmeTitle: programmes.title,
      certificationEnabled: programmes.certificationEnabled,
      isIllustrative: programmes.isIllustrative,
      cardImagePath: programmes.cardImagePath,
      status: enrolments.status,
      progressPercent: enrolments.progressPercent,
      currentStage: enrolments.currentStage,
      enrolledAt: enrolments.enrolledAt,
      lastActivityAt: enrolments.lastActivityAt,
    })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(eq(enrolments.learnerId, learnerId))
    .orderBy(asc(programmes.code))
  return {
    learner: {
      fullName: profile.fullName,
      firstName: profile.fullName.split(' ')[0] ?? profile.fullName,
      learnerCode: profile.learnerCode,
      jobTitle: profile.jobTitle,
      organisationName: profile.organisationName,
    },
    items: rows.map((r) => ({
      ...r,
      enrolledAt: r.enrolledAt.toISOString(),
      lastActivityAt: r.lastActivityAt?.toISOString() ?? null,
    })),
  }
}

/**
 * Enrols a learner in a programme with the path the published rules assign (brief §3–4, §14).
 * Existing enrolments are returned untouched, so other programmes' progress is preserved.
 * Shared seam: registration (public site) can call this inside its own transaction.
 */
export async function enrolLearner(
  learnerId: string,
  programme: ProgrammeCode,
  executor: Executor = db,
  actor: { id: string; role: 'learner' | 'trainer' | 'admin'; name: string } | null = null,
) {
  const [programmeRow] = await executor
    .select({ id: programmes.id, status: programmes.status })
    .from(programmes)
    .where(eq(programmes.code, programme))
    .limit(1)
  if (programmeRow?.status !== 'published') {
    throw HttpError.badRequest('This programme is not open for enrolment')
  }
  const [existing] = await executor
    .select({ id: enrolments.id })
    .from(enrolments)
    .where(and(eq(enrolments.learnerId, learnerId), eq(enrolments.programmeId, programmeRow.id)))
    .limit(1)
  if (existing) return { enrolmentId: existing.id, created: false }

  const profile = await loadLearnerProfile(executor, learnerId)
  const resolved = await resolveForProfile(executor, programme, toRuleProfile(profile))
  const instant = now()
  const [row] = await executor
    .insert(enrolments)
    .values({
      learnerId,
      programmeId: programmeRow.id,
      status: 'not_started',
      pathId: resolved?.pathId ?? null,
      pathVersionId: resolved?.pathVersionId ?? null,
      assignmentReason: resolved?.reason ?? 'Default path',
      currentStage:
        programme === 'A'
          ? 'Onboarding'
          : programme === 'B'
            ? 'Visitor Service Essentials'
            : 'Sample overview',
      progressPercent: 0,
      enrolledAt: instant,
    })
    .onConflictDoNothing()
    .returning({ id: enrolments.id })
  if (!row) {
    const [again] = await executor
      .select({ id: enrolments.id })
      .from(enrolments)
      .where(and(eq(enrolments.learnerId, learnerId), eq(enrolments.programmeId, programmeRow.id)))
      .limit(1)
    return { enrolmentId: again?.id ?? '', created: false }
  }
  await recordAudit(
    actor,
    {
      action: 'enrolment.create',
      objectType: 'enrolment',
      objectId: row.id,
      after: { programme, pathId: resolved?.pathId ?? null },
      reason: resolved?.reason ?? 'Default path',
    },
    executor,
  )
  return { enrolmentId: row.id, created: true }
}
