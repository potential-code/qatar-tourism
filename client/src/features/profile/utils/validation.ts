import { profileStepGoals, profileStepLocale, profileStepWork } from '@shared/schemas'
import type { z } from 'zod'
import { fullPayload, type ProfileDraft } from './draft'

export type FieldErrors = Partial<Record<keyof ProfileDraft | 'organisation', string>>

/** Plain-language messages for the wizard; the server re-validates with the same schemas. */
const MESSAGES: Record<string, string> = {
  organisationId: 'Choose your organisation, or select Other and enter its name',
  organisationOther: 'Enter your organisation name',
  organisationType: 'Choose the organisation type',
  jobTitle: 'Enter your job title',
  jobFunction: 'Choose your job function',
  seniority: 'Choose your seniority',
  experience: 'Choose your experience',
  country: 'Choose your country',
  preferredLanguage: 'Choose your preferred learning language',
  goals: 'Choose between one and three goals',
  weeklyMinutes: 'Choose your weekly learning time',
  acceptTerms: 'Accept the demo terms and privacy information to finish',
  mobile: 'Use 30 characters or fewer',
  accessibilityRequest: 'Use 500 characters or fewer',
}

function collect(result: z.ZodSafeParseResult<unknown>): FieldErrors {
  if (result.success) return {}
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '') as keyof FieldErrors
    if (key && !errors[key]) errors[key] = MESSAGES[key] ?? issue.message
  }
  return errors
}

export function validateStep(step: 1 | 2 | 3, draft: ProfileDraft): FieldErrors {
  const payload = fullPayload(draft)
  if (step === 1) {
    const errors = collect(profileStepWork.safeParse(payload))
    if (draft.organisationIsOther && !draft.organisationOther.trim()) {
      errors.organisationOther = MESSAGES.organisationOther
    }
    if (!draft.organisationIsOther && !draft.organisationId) {
      errors.organisation = MESSAGES.organisationId
    }
    return errors
  }
  if (step === 2) return collect(profileStepLocale.safeParse(payload))
  return collect(profileStepGoals.safeParse(payload))
}
