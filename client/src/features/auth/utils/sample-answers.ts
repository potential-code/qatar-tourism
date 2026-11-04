import { isArabicLanguage, sampleEmail } from '@/lib/demo-sample'

/** Presenter sample answers for the registration form. The email is new on every click. */
export function sampleRegistration(lang: string) {
  return {
    name: isArabicLanguage(lang) ? 'ليلى المنصوري' : 'Layla Al Mansoori',
    email: sampleEmail('visitor'),
    // The demo password every seeded account uses; meets the 8-character minimum.
    password: 'password',
  }
}
