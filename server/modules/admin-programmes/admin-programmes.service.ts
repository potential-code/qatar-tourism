import { db } from '@server/db/connection'
import {
  assessments,
  assignments,
  certificates,
  courses,
  enrolments,
  learningPaths,
  pathItems,
  programmes,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import type { AdminProgrammeUpdate } from '@shared/schemas/admin-programmes'
import { and, asc, count, countDistinct, eq, inArray } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'
import { canCertify, ENROLMENT_MODE } from './admin-programmes.policy'

/** Programme management (brief §14). Every figure is counted from the database. */
export async function listProgrammes() {
  const [rows, statusCounts, learners, paths, certs] = await Promise.all([
    db.select().from(programmes).orderBy(asc(programmes.code)),
    db
      .select({ programmeId: enrolments.programmeId, status: enrolments.status, n: count() })
      .from(enrolments)
      .groupBy(enrolments.programmeId, enrolments.status),
    db
      .select({ programmeId: enrolments.programmeId, n: countDistinct(enrolments.learnerId) })
      .from(enrolments)
      .groupBy(enrolments.programmeId),
    db
      .select({ programmeId: learningPaths.programmeId, n: count() })
      .from(learningPaths)
      .groupBy(learningPaths.programmeId),
    db
      .select({ programmeId: certificates.programmeId, n: count() })
      .from(certificates)
      .where(eq(certificates.status, 'issued'))
      .groupBy(certificates.programmeId),
  ])
  return rows.map((row) => {
    const mine = statusCounts.filter((s) => s.programmeId === row.id)
    const of = (status: string) => mine.find((s) => s.status === status)?.n ?? 0
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      audience: row.audience,
      summary: row.summary,
      formatLabel: row.formatLabel,
      durationLabel: row.durationLabel,
      levels: row.levels,
      certificationEnabled: row.certificationEnabled,
      canCertify: canCertify(row.code),
      isIllustrative: row.isIllustrative,
      status: row.status,
      cardImagePath: row.cardImagePath,
      enrolmentMode: ENROLMENT_MODE[row.code],
      enrolments: mine.reduce((sum, s) => sum + s.n, 0),
      completed: of('completed'),
      inProgress: of('in_progress') + of('awaiting_review'),
      notStarted: of('not_started'),
      learners: learners.find((l) => l.programmeId === row.id)?.n ?? 0,
      paths: paths.find((p) => p.programmeId === row.id)?.n ?? 0,
      certificates: certs.find((c) => c.programmeId === row.id)?.n ?? 0,
      updatedAt: row.updatedAt.toISOString(),
    }
  })
}

export async function getProgramme(programmeId: string) {
  const list = await listProgrammes()
  const programme = list.find((p) => p.id === programmeId)
  if (!programme) throw HttpError.notFound('Programme not found')
  const [row] = await db
    .select({ completionRules: programmes.completionRules })
    .from(programmes)
    .where(eq(programmes.id, programmeId))

  const paths = await db
    .select({
      id: learningPaths.id,
      code: learningPaths.code,
      name: learningPaths.name,
      isDefault: learningPaths.isDefault,
      currentVersionId: learningPaths.currentVersionId,
    })
    .from(learningPaths)
    .where(eq(learningPaths.programmeId, programmeId))
    .orderBy(asc(learningPaths.name))

  const defaultPath = paths.find((p) => p.isDefault) ?? paths[0]
  const versionIds = paths.map((p) => p.currentVersionId).filter((v): v is string => Boolean(v))
  const items = versionIds.length
    ? await db
        .select({
          versionId: pathItems.pathVersionId,
          position: pathItems.position,
          kind: pathItems.kind,
          title: pathItems.title,
          required: pathItems.required,
          level: pathItems.level,
          stage: pathItems.stage,
          courseCode: courses.code,
          courseTitle: courses.title,
          courseFormat: courses.format,
        })
        .from(pathItems)
        .leftJoin(courses, eq(courses.id, pathItems.courseId))
        .where(inArray(pathItems.pathVersionId, versionIds))
        .orderBy(asc(pathItems.position))
    : []

  const structureItems = items.filter((i) => i.versionId === defaultPath?.currentVersionId)
  const stages: {
    level: number
    stage: string
    items: { title: string; kind: string; required: boolean }[]
  }[] = []
  for (const item of structureItems) {
    let group = stages.find((s) => s.level === item.level && s.stage === item.stage)
    if (!group) {
      group = { level: item.level, stage: item.stage, items: [] }
      stages.push(group)
    }
    group.items.push({ title: item.title, kind: item.kind, required: item.required })
  }

  const catalogue = new Map<string, { code: string; title: string; format: string }>()
  for (const item of items) {
    if (item.courseCode && item.courseTitle && item.courseFormat)
      catalogue.set(item.courseCode, {
        code: item.courseCode,
        title: item.courseTitle,
        format: item.courseFormat,
      })
  }

  const kinds = new Set(items.map((i) => i.kind))
  const [allAssessments, programmeAssignments] = await Promise.all([
    db
      .select({
        code: assessments.code,
        title: assessments.title,
        kind: assessments.kind,
        version: assessments.version,
        passPercent: assessments.passPercent,
      })
      .from(assessments)
      .orderBy(assessments.code),
    db
      .select({
        code: assignments.code,
        title: assignments.title,
        passPercent: assignments.passPercent,
      })
      .from(assignments)
      .where(eq(assignments.programmeId, programmeId)),
  ])
  const usedAssessments = allAssessments.filter(
    (a) =>
      (a.kind === 'pre' && kinds.has('assessment_pre')) ||
      (a.kind === 'post' && kinds.has('assessment_post')) ||
      (a.kind === 'formative' && kinds.has('assessment_formative')),
  )

  return {
    ...programme,
    completionRules: (row?.completionRules ?? {}) as Record<string, unknown>,
    defaultPath: defaultPath
      ? { id: defaultPath.id, code: defaultPath.code, name: defaultPath.name }
      : null,
    paths: paths.map(({ currentVersionId, ...p }) => ({
      ...p,
      published: Boolean(currentVersionId),
    })),
    structure: stages,
    catalogue: [...catalogue.values()].sort((a, b) => a.code.localeCompare(b.code)),
    assessments: usedAssessments,
    assignments: programmeAssignments,
  }
}

/** Updates a programme. Certification can be switched on for Program A only. */
export async function updateProgramme(
  viewer: Viewer,
  programmeId: string,
  input: AdminProgrammeUpdate,
  requestId?: string,
) {
  const [current] = await db
    .select()
    .from(programmes)
    .where(eq(programmes.id, programmeId))
    .limit(1)
  if (!current) throw HttpError.notFound('Programme not found')
  if (input.certificationEnabled === true && !canCertify(current.code)) {
    throw new HttpError(
      422,
      'CERTIFICATION_NOT_ALLOWED',
      `Program ${current.code} does not issue certificates. Certification stays off.`,
    )
  }

  const changes = Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => value !== undefined && current[key as keyof typeof current] !== value,
    ),
  ) as AdminProgrammeUpdate
  if (Object.keys(changes).length === 0) return { id: programmeId, changed: [] as string[] }

  return db.transaction(async (tx) => {
    await tx
      .update(programmes)
      .set({ ...changes, updatedAt: now() })
      .where(and(eq(programmes.id, programmeId)))
    await recordAudit(
      viewer,
      {
        action: 'programme.update',
        objectType: 'programme',
        objectId: current.code,
        before: Object.fromEntries(
          Object.keys(changes).map((key) => [key, current[key as keyof typeof current]]),
        ),
        after: changes,
      },
      tx,
      requestId,
    )
    return { id: programmeId, changed: Object.keys(changes) }
  })
}
