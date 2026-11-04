import type { OrganisationOption } from '../queries/profile.queries'
import type { ProfileDraft } from './draft'

/**
 * Presenter sample answers for the profile wizard, one patch per step. Fictional and valid
 * against the step schemas. Edit freely: each value must stay one of the seeded options.
 */
type Lang = 'en' | 'ar'

const isArabic = (lang: string): Lang => (lang.startsWith('ar') ? 'ar' : 'en')

/** Step 1. The organisation is the first seeded hotel the search returns. */
export function sampleWork(hotel: OrganisationOption | undefined): Partial<ProfileDraft> {
  return {
    ...(hotel
      ? {
          organisationId: hotel.id,
          organisationName: hotel.name,
          organisationOther: '',
          organisationIsOther: false,
          organisationIsPseudo: false,
          organisationType: hotel.type,
        }
      : {
          organisationId: null,
          organisationName: '',
          organisationOther: 'Corniche Bay Suites',
          organisationIsOther: true,
          organisationIsPseudo: false,
          organisationType: 'hotel_accommodation',
        }),
    jobTitle: 'Front Office Agent',
    jobFunction: 'front_office',
    seniority: 'experienced_professional',
    experience: '1_3',
  }
}

const LOCALE: Record<Lang, Partial<ProfileDraft>> = {
  en: {
    country: 'Qatar',
    city: 'Doha',
    preferredLanguage: 'English',
    captionsPreference: true,
    accessibilityRequest: 'Captions on videos help me follow lessons on my break in a busy lobby.',
  },
  ar: {
    country: 'Qatar',
    city: 'الدوحة',
    preferredLanguage: 'Arabic',
    captionsPreference: true,
    accessibilityRequest:
      'تساعدني الترجمة النصية للفيديو على متابعة الدروس في استراحتي ببهو مزدحم.',
  },
}

/** Step 2: where and how. */
export const sampleLocale = (lang: string): Partial<ProfileDraft> => LOCALE[isArabic(lang)]

/** Step 3: goals, time per week, a fictional mobile number and consent. */
export function sampleGoals(): Partial<ProfileDraft> {
  return {
    goals: ['visitor_welcome', 'complaint_handling', 'communication'],
    weeklyMinutes: 30,
    mobile: '+974 5550 0123',
    acceptTerms: true,
    marketingOptIn: false,
  }
}
