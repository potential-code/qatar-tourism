import { profileStepGoals, profileStepLocale, profileStepWork } from '@shared/schemas'
import type { z } from 'zod'
import i18n from '@/i18n'
import { fullPayload, type ProfileDraft } from './draft'

export type FieldErrors = Partial<Record<keyof ProfileDraft | 'organisation', string>>

/** Plain-language messages for the wizard; the server re-validates with the same schemas. */
const message = (key: string): string | undefined => {
  const path = `profile.errors.${key}`
  return i18n.exists(path, { ns: 'learner' }) ? i18n.t(path as never, { ns: 'learner' }) : undefined
}

function collect(result: z.ZodSafeParseResult<unknown>): FieldErrors {
  if (result.success) return {}
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '') as keyof FieldErrors
    if (key && !errors[key]) errors[key] = message(key) ?? issue.message
  }
  return errors
}

export function validateStep(step: 1 | 2 | 3, draft: ProfileDraft): FieldErrors {
  const payload = fullPayload(draft)
  if (step === 1) {
    const errors = collect(profileStepWork.safeParse(payload))
    if (draft.organisationIsOther && !draft.organisationOther.trim()) {
      errors.organisationOther = message('organisationOther')
    }
    if (!draft.organisationIsOther && !draft.organisationId) {
      errors.organisation = message('organisationId')
    }
    return errors
  }
  if (step === 2) return collect(profileStepLocale.safeParse(payload))
  return collect(profileStepGoals.safeParse(payload))
}
