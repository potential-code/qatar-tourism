import { db } from '@server/db/connection'
import { organisations, profiles } from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import { findOrCreateOtherOrganisation } from '@server/modules/organisations/organisations.service'
import {
  type Actor,
  applyRevision,
  enrol,
  findEnrolment,
  listOwnEnrolments,
  pendingRevisions,
  type Tx,
} from '@server/modules/programmes/enrolment.service'
import type { OrganisationType } from '@shared/constants'
import type { ProfileCompleteInput, ProfileDraftInput } from '@shared/schemas'
import type { ProfileUpdateInput } from '@shared/schemas/profile-account'
import { eq } from 'drizzle-orm'

/**
 * The learner's own profile (brief §4): resumable three-step wizard, completion, later edits.
 * Every function is scoped to the caller's own user id; there is no id parameter to tamper with.
 */

type ProfileRow = typeof profiles.$inferSelect

/** Fields that count toward the completeness meter. Optional fields (city, mobile…) do not. */
function completenessOf(row: Partial<ProfileRow>): number {
  const checks = [
    Boolean(row.fullName),
    Boolean(row.organisationId),
    Boolean(row.jobTitle),
    Boolean(row.jobFunction),
    Boolean(row.seniority),
    Boolean(row.experience),
    Boolean(row.country),
    Boolean(row.preferredLanguage),
    (row.goals?.length ?? 0) > 0,
    Boolean(row.weeklyMinutes),
    Boolean(row.consentAcceptedAt),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

async function loadOwnRow(userId: string, executor: typeof db | Tx = db) {
  const [row] = await executor.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
  if (!row) throw HttpError.notFound('No learner profile is linked to this account')
  return row
}

/**
 * Resolves the organisation choice: an existing organisation id, or "Other" with a typed name
 * (recorded with its type so path rules keep working).
 */
async function resolveOrganisation(
  input: {
    organisationId?: string | null
    organisationOther?: string | null
    organisationType?: OrganisationType
  },
  executor: Tx,
): Promise<{ organisationId: string | null; organisationOther: string | null } | null> {
  if (input.organisationId) {
    const [org] = await executor
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.id, input.organisationId))
      .limit(1)
    if (!org) throw HttpError.badRequest('Choose an organisation from the list or select Other')
    return { organisationId: org.id, organisationOther: null }
  }
  const other = input.organisationOther?.trim()
  if (other && input.organisationType) {
    const org = await findOrCreateOtherOrganisation(other, input.organisationType, executor)
    return { organisationId: org.id, organisationOther: other }
  }
  return null
}

function definedOnly<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>
}

export async function getOwnProfile(userId: string) {
  const row = await loadOwnRow(userId)
  const [org] = row.organisationId
    ? await db
        .select({
          name: organisations.name,
          type: organisations.type,
          isPseudo: organisations.isPseudo,
        })
        .from(organisations)
        .where(eq(organisations.id, row.organisationId))
        .limit(1)
    : []
  const [enrolmentList, revisions] = await Promise.all([
    listOwnEnrolments(userId),
    pendingRevisions(userId),
  ])
  return {
    learnerCode: row.learnerCode,
    fullName: row.fullName,
    organisationId: row.organisationId,
    organisationOther: row.organisationOther,
    organisationName: org?.name ?? row.organisationOther ?? null,
    organisationType: org?.type ?? null,
    organisationIsPseudo: org?.isPseudo ?? false,
    jobTitle: row.jobTitle,
    jobFunction: row.jobFunction,
    seniority: row.seniority,
    experience: row.experience,
    country: row.country,
    city: row.city,
    preferredLanguage: row.preferredLanguage,
    captionsPreference: row.captionsPreference,
    accessibilityRequest: row.accessibilityRequest,
    goals: row.goals,
    weeklyMinutes: row.weeklyMinutes,
    mobile: row.mobile,
    marketingOptIn: row.marketingOptIn,
    consentAcceptedAt: row.consentAcceptedAt?.toISOString() ?? null,
    status: row.status,
    wizardStep: row.wizardStep,
    completeness: row.completeness,
    enrolments: enrolmentList,
    revisions,
  }
}

export type OwnProfile = Awaited<ReturnType<typeof getOwnProfile>>

/** Saves a wizard step as a draft so the learner can leave and resume (brief §4). */
export async function saveDraft(userId: string, input: ProfileDraftInput) {
  await db.transaction(async (tx) => {
    const row = await loadOwnRow(userId, tx)
    const org = await resolveOrganisation(input, tx)
    const patch = definedOnly({
      ...(org ?? {}),
      jobTitle: input.jobTitle,
      jobFunction: input.jobFunction,
      seniority: input.seniority,
      experience: input.experience,
      country: input.country,
      city: input.city,
      preferredLanguage: input.preferredLanguage,
      captionsPreference: input.captionsPreference,
      accessibilityRequest: input.accessibilityRequest,
      goals: input.goals,
      weeklyMinutes: input.weeklyMinutes,
      mobile: input.mobile,
      marketingOptIn: input.marketingOptIn,
    })
    const merged = { ...row, ...patch }
    await tx
      .update(profiles)
      .set({
        ...patch,
        wizardStep: Math.max(row.status === 'complete' ? 3 : 1, input.step),
        completeness: completenessOf(merged),
        lastActivityAt: now(),
        updatedAt: now(),
      })
      .where(eq(profiles.userId, userId))
  })
  return getOwnProfile(userId)
}

function fullFields(
  input: ProfileUpdateInput,
  org: { organisationId: string | null; organisationOther: string | null },
) {
  return {
    ...org,
    jobTitle: input.jobTitle,
    jobFunction: input.jobFunction,
    seniority: input.seniority,
    experience: input.experience,
    country: input.country,
    city: input.city ?? null,
    preferredLanguage: input.preferredLanguage,
    captionsPreference: input.captionsPreference ?? null,
    accessibilityRequest: input.accessibilityRequest || null,
    goals: input.goals,
    weeklyMinutes: input.weeklyMinutes,
    mobile: input.mobile || null,
    marketingOptIn: input.marketingOptIn,
  }
}

async function requireOrganisation(input: ProfileUpdateInput, tx: Tx) {
  const org = await resolveOrganisation(input, tx)
  if (!org) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid request', {
      target: 'json',
      issues: [
        { path: 'organisationId', message: 'Choose an organisation or enter one under Other' },
      ],
    })
  }
  return org
}

/**
 * Finishes the wizard (brief §4 routing: profile → Program B welcome → pre-assessment).
 * A learner with no enrolment is placed on Program B; a Program B enrolment that has not started
 * moves from the default path to the rule-matched path, which loses nothing.
 */
export async function completeProfile(actor: Actor, input: ProfileCompleteInput) {
  const next = await db.transaction(async (tx) => {
    const row = await loadOwnRow(actor.id, tx)
    const org = await requireOrganisation(input, tx)
    const fields = fullFields(input, org)
    const consentAcceptedAt = row.consentAcceptedAt ?? now()
    await tx
      .update(profiles)
      .set({
        ...fields,
        status: 'complete',
        wizardStep: 3,
        consentAcceptedAt,
        completeness: completenessOf({ ...row, ...fields, consentAcceptedAt }),
        lastActivityAt: now(),
        updatedAt: now(),
      })
      .where(eq(profiles.userId, actor.id))

    const [a, b] = await Promise.all([
      findEnrolment(actor.id, 'A', tx),
      findEnrolment(actor.id, 'B', tx),
    ])
    if (!a && !b) await enrol(actor, actor.id, 'B', tx)
    if (b && b.status === 'not_started' && !b.startedAt && !b.overrideReason) {
      await applyRevision(actor, actor.id, 'B', 'profile completed before the learner started', tx)
    }
    // Came from the Program A call to action without a B enrolment: continue to A.
    return a && !b ? ('A' as const) : ('B' as const)
  })
  return { next, profile: await getOwnProfile(actor.id) }
}

/**
 * Profile page edits (brief §4). A role or organisation change never moves a path silently:
 * the response lists the revised recommendation for the learner to accept or keep.
 */
export async function updateProfile(userId: string, input: ProfileUpdateInput) {
  await db.transaction(async (tx) => {
    const row = await loadOwnRow(userId, tx)
    const org = await requireOrganisation(input, tx)
    const fields = fullFields(input, org)
    await tx
      .update(profiles)
      .set({
        ...fields,
        completeness: completenessOf({ ...row, ...fields }),
        lastActivityAt: now(),
        updatedAt: now(),
      })
      .where(eq(profiles.userId, userId))
  })
  return getOwnProfile(userId)
}

export async function acceptRevision(actor: Actor, programme: 'A' | 'B' | 'C') {
  const result = await db.transaction((tx) =>
    applyRevision(actor, actor.id, programme, 'accepted by the learner after a profile update', tx),
  )
  if (!result) throw HttpError.notFound('No enrolment on this programme')
  return { ...result, profile: await getOwnProfile(actor.id) }
}
