import type {
  ExperienceBand,
  JobFunction,
  LearningGoal,
  OrganisationType,
  Seniority,
} from '@shared/constants'
import type { OwnProfile } from '../queries/profile.queries'

/** The wizard's working copy. Empty strings mean "not answered yet". */
export type ProfileDraft = {
  organisationId: string | null
  organisationName: string
  organisationOther: string
  /** The learner chose Other and types the organisation name. */
  organisationIsOther: boolean
  organisationIsPseudo: boolean
  organisationType: OrganisationType | ''
  jobTitle: string
  jobFunction: JobFunction | ''
  seniority: Seniority | ''
  experience: ExperienceBand | ''
  country: string
  city: string
  preferredLanguage: string
  captionsPreference: boolean
  accessibilityRequest: string
  goals: LearningGoal[]
  weeklyMinutes: 15 | 30 | 60 | 120 | null
  mobile: string
  acceptTerms: boolean
  marketingOptIn: boolean
}

export function draftFromProfile(profile: OwnProfile): ProfileDraft {
  const other = profile.organisationOther
  return {
    organisationId: other ? null : profile.organisationId,
    organisationName: other ? '' : (profile.organisationName ?? ''),
    organisationOther: other ?? '',
    organisationIsOther: Boolean(other),
    organisationIsPseudo: profile.organisationIsPseudo,
    organisationType: profile.organisationType ?? '',
    jobTitle: profile.jobTitle ?? '',
    jobFunction: profile.jobFunction ?? '',
    seniority: profile.seniority ?? '',
    experience: profile.experience ?? '',
    country: profile.country ?? 'Qatar',
    city: profile.city ?? '',
    preferredLanguage: profile.preferredLanguage ?? 'English',
    captionsPreference: profile.captionsPreference ?? false,
    accessibilityRequest: profile.accessibilityRequest ?? '',
    goals: profile.goals as LearningGoal[],
    weeklyMinutes: (profile.weeklyMinutes as ProfileDraft['weeklyMinutes']) ?? null,
    mobile: profile.mobile ?? '',
    acceptTerms: Boolean(profile.consentAcceptedAt),
    marketingOptIn: profile.marketingOptIn,
  }
}

const orUndefined = <T>(value: T | '' | null) =>
  value === '' || value === null ? undefined : value

/** Organisation part of the payload: a chosen organisation, or "Other" with a typed name. */
function organisationPayload(draft: ProfileDraft) {
  return draft.organisationIsOther
    ? { organisationId: null, organisationOther: draft.organisationOther.trim() || null }
    : { organisationId: draft.organisationId, organisationOther: null }
}

export function draftPayload(draft: ProfileDraft, step: 1 | 2 | 3) {
  return {
    step,
    ...organisationPayload(draft),
    organisationType: orUndefined(draft.organisationType),
    jobTitle: orUndefined(draft.jobTitle.trim()),
    jobFunction: orUndefined(draft.jobFunction),
    seniority: orUndefined(draft.seniority),
    experience: orUndefined(draft.experience),
    country: orUndefined(draft.country.trim()),
    city: draft.city.trim() || undefined,
    preferredLanguage: orUndefined(draft.preferredLanguage),
    captionsPreference: draft.captionsPreference,
    accessibilityRequest: draft.accessibilityRequest.trim() || undefined,
    goals: draft.goals.length > 0 ? draft.goals : undefined,
    weeklyMinutes: draft.weeklyMinutes ?? undefined,
    mobile: draft.mobile.trim() || undefined,
    marketingOptIn: draft.marketingOptIn,
  }
}

/** Full payload for completion / edits; validated by the shared zod schemas before sending. */
export function fullPayload(draft: ProfileDraft) {
  return {
    ...organisationPayload(draft),
    organisationType: draft.organisationType,
    jobTitle: draft.jobTitle.trim(),
    jobFunction: draft.jobFunction,
    seniority: draft.seniority,
    experience: draft.experience,
    country: draft.country.trim(),
    city: draft.city.trim() || undefined,
    preferredLanguage: draft.preferredLanguage,
    captionsPreference: draft.captionsPreference,
    accessibilityRequest: draft.accessibilityRequest.trim() || undefined,
    goals: draft.goals,
    weeklyMinutes: draft.weeklyMinutes,
    mobile: draft.mobile.trim() || undefined,
    acceptTerms: draft.acceptTerms,
    marketingOptIn: draft.marketingOptIn,
  }
}
