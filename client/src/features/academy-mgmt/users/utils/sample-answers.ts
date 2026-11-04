import type { OrganisationType } from '@shared/constants'
import { shortRandom } from '@/lib/demo-sample'
import type { LearnerFormValues } from '../components/LearnerFormDialog'

/** Presenter sample for "Add a fictional learner". The email is new on every click. */
export function sampleLearner(
  organisations: readonly { id: string; type: OrganisationType }[],
): LearnerFormValues {
  const hotel = organisations.find((o) => o.type === 'hotel_accommodation') ?? organisations[0]
  return {
    name: 'Reem Al Kuwari',
    email: `reem.alkuwari-${shortRandom()}@example.com`,
    organisationId: hotel?.id ?? null,
    jobTitle: 'Guest Relations Officer',
    jobFunction: 'guest_services',
    seniority: 'entry_level',
    experience: '1_3',
  }
}
