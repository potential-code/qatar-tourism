import type { ProgrammeCode } from '@shared/constants'
import { shortRandom } from '@/lib/demo-sample'

/** Presenter sample for "Provision a trainer". Fictional; the email is new on every click. */
export function sampleTrainer() {
  return {
    fullName: 'Omar Al Mansoori',
    email: `omar.almansoori-${shortRandom()}@example.com`,
    headline: 'Guest experience coach, Arabic and English',
    bio: 'Omar spent twelve years in front office and guest relations at Doha hotels before moving into training. He coaches teams on warm greetings, handling changed bookings and clear follow-up messages.',
    expertise: 'Service recovery, Visitor welcome, Heritage storytelling',
    languages: 'Arabic, English',
    organisation: 'Demo Academy Faculty',
    programmes: ['A', 'B'] as ProgrammeCode[],
  }
}
