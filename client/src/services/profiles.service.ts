import type { OrganisationType, ProgrammeCode } from '@shared/constants'
import { profileCompleteInput, profileDraftInput } from '@shared/schemas'
import {
  type ProfileUpdateInput,
  pathRevisionInput,
  profileUpdateInput,
} from '@shared/schemas/profile-account'
import type { ProfileRow } from '@shared/types/db'
import type { z } from 'zod'
import { ApiError, commit, db, delay, nowIso, out, parseInput, requireRole, updateRow } from './api'
import {
  applyRevision,
  enrol,
  enrolmentOf,
  listOwnEnrolments,
  pendingRevisions,
} from './enrolment/core'
import { findOrCreateOtherOrganisation } from './organisations.service'

/**
 * The learner's own profile (brief §4): resumable three-step wizard, completion, later edits.
 * Formerly server/modules/profiles/profiles.service.ts. Learners only (profiles.policy), and
 * every function is scoped to the signed-in user: there is no id parameter to tamper with.
 */

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

function ownRow(userId: string): ProfileRow {
  const row = db.profiles.find((p) => p.userId === userId)
  if (!row) throw ApiError.notFound('No learner profile is linked to this account')
  return row
}

type OrganisationChoice = {
  organisationId?: string | null
  organisationOther?: string | null
  organisationType?: OrganisationType
}

/**
 * Checks the organisation choice without writing: an existing organisation id, or "Other"
 * with a typed name and type. Returns a function that applies it (creating the "Other"
 * organisation when needed), or null when nothing was chosen.
 */
function checkOrganisation(input: OrganisationChoice) {
  if (input.organisationId) {
    const org = db.organisations.find((o) => o.id === input.organisationId)
    if (!org) throw ApiError.badRequest('Choose an organisation from the list or select Other')
    return () => ({ organisationId: org.id, organisationOther: null })
  }
  const other = input.organisationOther?.trim()
  const type = input.organisationType
  if (other && type) {
    return () => ({
      organisationId: findOrCreateOtherOrganisation(other, type).id,
      organisationOther: other,
    })
  }
  return null
}

function requireOrganisation(input: OrganisationChoice) {
  const apply = checkOrganisation(input)
  if (!apply) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', {
      target: 'json',
      issues: [
        { path: 'organisationId', message: 'Choose an organisation or enter one under Other' },
      ],
    })
  }
  return apply
}

function definedOnly<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>
}

function ownProfileView(userId: string) {
  const row = ownRow(userId)
  const org = row.organisationId
    ? db.organisations.find((o) => o.id === row.organisationId)
    : undefined
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
    consentAcceptedAt: row.consentAcceptedAt,
    status: row.status,
    wizardStep: row.wizardStep,
    completeness: row.completeness,
    enrolments: listOwnEnrolments(userId),
    revisions: pendingRevisions(userId),
  }
}

export type OwnProfile = ReturnType<typeof ownProfileView>
export type PathRevision = OwnProfile['revisions'][number]

/** The signed-in learner's profile, enrolments and any offered path revisions. */
export async function getOwnProfile(): Promise<OwnProfile> {
  await delay()
  const user = requireRole('learner')
  return out(ownProfileView(user.id))
}

/** Saves a wizard step as a draft so the learner can leave and resume (brief §4). */
export async function saveDraft(input: z.input<typeof profileDraftInput>): Promise<OwnProfile> {
  await delay()
  const user = requireRole('learner')
  const parsed = parseInput(profileDraftInput, input)
  const row = ownRow(user.id)
  const applyOrg = checkOrganisation(parsed)

  const patch = definedOnly({
    ...(applyOrg?.() ?? {}),
    jobTitle: parsed.jobTitle,
    jobFunction: parsed.jobFunction,
    seniority: parsed.seniority,
    experience: parsed.experience,
    country: parsed.country,
    city: parsed.city,
    preferredLanguage: parsed.preferredLanguage,
    captionsPreference: parsed.captionsPreference,
    accessibilityRequest: parsed.accessibilityRequest,
    goals: parsed.goals,
    weeklyMinutes: parsed.weeklyMinutes,
    mobile: parsed.mobile,
    marketingOptIn: parsed.marketingOptIn,
  }) as Partial<ProfileRow>
  updateRow(row, {
    ...patch,
    wizardStep: Math.max(row.status === 'complete' ? 3 : 1, parsed.step),
    completeness: completenessOf({ ...row, ...patch }),
    lastActivityAt: nowIso(),
  })
  commit()
  return out(ownProfileView(user.id))
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
    goals: input.goals as string[],
    weeklyMinutes: input.weeklyMinutes,
    mobile: input.mobile || null,
    marketingOptIn: input.marketingOptIn,
  }
}

/**
 * Finishes the wizard (brief §4 routing: profile → Program B welcome → pre-assessment).
 * A learner with no enrolment is placed on Program B; a Program B enrolment that has not started
 * moves from the default path to the rule-matched path, which loses nothing.
 */
export async function completeProfile(input: z.input<typeof profileCompleteInput>) {
  await delay()
  const user = requireRole('learner')
  const parsed = parseInput(profileCompleteInput, input)
  const row = ownRow(user.id)
  const applyOrg = requireOrganisation(parsed)

  const fields = fullFields(parsed, applyOrg())
  const consentAcceptedAt = row.consentAcceptedAt ?? nowIso()
  updateRow(row, {
    ...fields,
    status: 'complete',
    wizardStep: 3,
    consentAcceptedAt,
    completeness: completenessOf({ ...row, ...fields, consentAcceptedAt }),
    lastActivityAt: nowIso(),
  })

  const actor = { id: user.id, role: user.role, name: user.name }
  const a = enrolmentOf(user.id, 'A')
  const b = enrolmentOf(user.id, 'B')
  if (!a && !b) enrol(actor, user.id, 'B')
  if (b && b.status === 'not_started' && !b.startedAt && !b.overrideReason) {
    applyRevision(actor, user.id, 'B', 'profile completed before the learner started')
  }
  commit()
  // Came from the Program A call to action without a B enrolment: continue to A.
  const next: ProgrammeCode = a && !b ? 'A' : 'B'
  return out({ next: next as 'A' | 'B', profile: ownProfileView(user.id) })
}

/**
 * Profile page edits (brief §4). A role or organisation change never moves a path silently:
 * the response lists the revised recommendation for the learner to accept or keep.
 */
export async function updateProfile(input: z.input<typeof profileUpdateInput>) {
  await delay()
  const user = requireRole('learner')
  const parsed = parseInput(profileUpdateInput, input)
  const row = ownRow(user.id)
  const applyOrg = requireOrganisation(parsed)
  const fields = fullFields(parsed, applyOrg())
  updateRow(row, {
    ...fields,
    completeness: completenessOf({ ...row, ...fields }),
    lastActivityAt: nowIso(),
  })
  commit()
  return out(ownProfileView(user.id))
}

/** Accepts the revised recommended path offered after a profile change. */
export async function acceptRevision(programme: ProgrammeCode) {
  await delay()
  const user = requireRole('learner')
  const parsed = parseInput(pathRevisionInput, { programme })
  const result = applyRevision(
    { id: user.id, role: user.role, name: user.name },
    user.id,
    parsed.programme,
    'accepted by the learner after a profile update',
  )
  if (!result) throw ApiError.notFound('No enrolment on this programme')
  commit()
  return out({ ...result, profile: ownProfileView(user.id) })
}
