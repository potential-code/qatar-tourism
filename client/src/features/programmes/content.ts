import type { ProgrammeCode } from '@shared/constants'

/**
 * Programme overview copy (brief §3, §5, §6, §7). Numbers that an administrator can change
 * (pass marks) are read from the programme's completion rules in the database, not from here.
 */
export type ProgrammeCopy = {
  slug: 'a' | 'b' | 'c'
  heroImage: string
  heroAlt: string
  outcomes: string[]
  prerequisites: string
  effort: string
  audienceDetail: string
  certificationLabel: string
}

export const PROGRAMME_COPY: Record<ProgrammeCode, ProgrammeCopy> = {
  A: {
    slug: 'a',
    heroImage: '/images/official/museum-family.jpg',
    heroAlt: 'A family walking at the National Museum of Qatar',
    outcomes: [
      'Welcome every visitor with a confident greeting, a useful question and a clear next step.',
      'Communicate clearly and inclusively, and check that the visitor has understood.',
      'Recover a difficult service moment with acknowledgement, feasible options and escalation.',
      'Apply your skills in a scored, trainer-led session in person or live online.',
      'Plan a helpful response to a changed booking in a practical assignment.',
    ],
    prerequisites:
      'A learner account and a completed profile. Level 2 sessions open once Level 1 is complete.',
    effort: 'Approximately 4 hours across two levels, including one 60-minute trainer-led session.',
    audienceDetail:
      'Hotel, tour, transport, travel trade and venue professionals who want a structured route with trainer feedback.',
    certificationLabel: 'Certification track',
  },
  B: {
    slug: 'b',
    heroImage: '/images/official/dhow-boat-min.jpg',
    heroAlt: 'A family on a dhow with the Museum of Islamic Art behind them',
    outcomes: [
      'Find out what a visitor needs by asking about interests and available time.',
      'Explain options in plain language and check understanding.',
      'Respond to a disappointed visitor with care and realistic choices.',
      'Measure your improvement from your baseline to your post-assessment.',
    ],
    prerequisites:
      'None. Create an account and complete your profile. The pre-assessment shows where to start and is not an entry barrier.',
    effort: 'Approximately 60–90 minutes, self-paced, in one stage: Visitor Service Essentials.',
    audienceDetail:
      'Anyone who serves visitors, whatever their role or organisation. Your profile shapes the selection and order of units.',
    certificationLabel: 'No certificate',
  },
  C: {
    slug: 'c',
    heroImage: '/images/official/grid-qatar-national-library-2-7740-wip-5.jpg',
    heroAlt: 'Visitors in the Qatar National Library',
    outcomes: [
      'Plan a short destination story with a clear opening, one memorable detail and a close.',
      'Choose details you can verify and that suit the visitor in front of you.',
      'Tell the story in about five minutes using a fictional story-planning worksheet.',
    ],
    prerequisites: 'None. This is a sample overview for illustration only.',
    effort: 'A 5-minute preview with a fictional story-planning worksheet.',
    audienceDetail:
      'Shown to illustrate how a future Academy offering could appear. It is not an actual Qatar Tourism programme.',
    certificationLabel: 'Sample overview, no certificate',
  },
}

export const ILLUSTRATIVE_NOTE =
  'Illustrative sample programme. It shows how a future Academy offering could look, with seeded reporting and a working overview. It is not an actual Qatar Tourism programme, and no complete third journey is part of this demonstration.'

export function programmeSlug(code: ProgrammeCode) {
  return PROGRAMME_COPY[code].slug
}
