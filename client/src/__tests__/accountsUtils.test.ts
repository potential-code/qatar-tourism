import { describe, expect, test } from 'bun:test'
import { draftPayload, fullPayload, type ProfileDraft } from '@/features/profile/utils/draft'
import { validateStep } from '@/features/profile/utils/validation'
import {
  dateChip,
  formatLabel,
  initials,
  sessionTimeRange,
} from '@/features/programmes/utils/format'
import { programmeFromSlug } from '@/features/programmes/utils/slug'

const empty: ProfileDraft = {
  organisationId: null,
  organisationName: '',
  organisationOther: '',
  organisationIsOther: false,
  organisationIsPseudo: false,
  organisationType: '',
  jobTitle: '',
  jobFunction: '',
  seniority: '',
  experience: '',
  country: 'Qatar',
  city: '',
  preferredLanguage: 'English',
  captionsPreference: false,
  accessibilityRequest: '',
  goals: [],
  weeklyMinutes: null,
  mobile: '',
  acceptTerms: false,
  marketingOptIn: false,
}

const complete: ProfileDraft = {
  ...empty,
  organisationId: '60d856eb-76f0-5021-adce-f7f2372ae89e',
  organisationName: 'Demo Pearl Hospitality',
  organisationType: 'hotel_accommodation',
  jobTitle: 'Guest Relations Officer',
  jobFunction: 'guest_services',
  seniority: 'experienced_professional',
  experience: '4_7',
  goals: ['complaint_handling', 'communication'],
  weeklyMinutes: 60,
  acceptTerms: true,
}

describe('programme slugs', () => {
  test('maps /programmes/a|b|c to codes and rejects anything else', () => {
    expect(programmeFromSlug('a')).toBe('A')
    expect(programmeFromSlug('B')).toBe('B')
    expect(programmeFromSlug('d')).toBeNull()
    expect(programmeFromSlug('ab')).toBeNull()
  })
})

describe('Qatar time formatting', () => {
  test('renders UTC instants in Asia/Qatar (UTC+3)', () => {
    expect(sessionTimeRange('2026-10-29T06:00:00.000Z', '2026-10-29T07:00:00.000Z')).toBe(
      '09:00 to 10:00',
    )
    // 22:30 UTC is already the next calendar day in Qatar.
    expect(dateChip('2026-10-29T22:30:00.000Z')).toMatchObject({ day: '30', month: 'Oct' })
    expect(formatLabel('online')).toBe('Live online')
    expect(initials('Amal Al Nouri')).toBe('AA')
  })
})

describe('profile wizard validation (brief §4)', () => {
  test('step 1 asks for an organisation and every work field', () => {
    const errors = validateStep(1, empty)
    expect(Object.keys(errors).sort()).toEqual(
      [
        'experience',
        'jobFunction',
        'jobTitle',
        'organisation',
        'organisationType',
        'seniority',
      ].sort(),
    )
  })

  test('"Other" needs a typed organisation name instead of a selection', () => {
    const errors = validateStep(1, { ...complete, organisationId: null, organisationIsOther: true })
    expect(errors.organisationOther).toBeDefined()
    expect(errors.organisation).toBeUndefined()
  })

  test('step 3 needs one to three goals, a weekly time and consent', () => {
    expect(Object.keys(validateStep(3, empty)).sort()).toEqual(
      ['acceptTerms', 'goals', 'weeklyMinutes'].sort(),
    )
    expect(validateStep(3, complete)).toEqual({})
  })

  test('a complete draft passes every step', () => {
    expect(validateStep(1, complete)).toEqual({})
    expect(validateStep(2, complete)).toEqual({})
  })

  test('draft payloads omit unanswered fields so a resume keeps earlier answers', () => {
    const payload = draftPayload({ ...empty, jobTitle: 'Driver' }, 2)
    expect(payload.step).toBe(2)
    expect(payload.jobTitle).toBe('Driver')
    expect(payload.jobFunction).toBeUndefined()
    expect(payload.goals).toBeUndefined()
  })

  test('an "Other" organisation is sent as a name, never as an id', () => {
    const payload = fullPayload({
      ...complete,
      organisationIsOther: true,
      organisationOther: ' Demo Bay Tours ',
    })
    expect(payload.organisationId).toBeNull()
    expect(payload.organisationOther).toBe('Demo Bay Tours')
  })
})
