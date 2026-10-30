import type {
  ExperienceBand,
  JobFunction,
  LearningGoal,
  OrganisationType,
  Seniority,
} from '@shared/constants'

/**
 * Walkthrough personas L0001–L0005 (brief §15). Their profiles are fixed; the enrolment
 * states below are pinned by the activity planner so the demo script always finds them.
 */
export type PersonaSeed = {
  n: number
  fullName: string
  organisation: string
  orgType: OrganisationType
  jobTitle: string
  jobFunction: JobFunction
  seniority: Seniority
  experience: ExperienceBand
  language: string
  goals: LearningGoal[]
  weeklyMinutes: 15 | 30 | 60 | 120
  country: string
  city: string
  /** Programmes held, with the pinned stage (see plan.ts for stage meanings). */
  enrolments: { programme: 'A' | 'B'; stage: string }[]
  note: string
  /** Overrides the generated learnerNNNN@example.com address. */
  email?: string
  /** Stable CRM identifier for the integration demo (29 Oct), e.g. CRM-0042. */
  externalLearnerId?: string
}

/** Mariam Al Nuaimi: the 29 Oct unified-record demonstration learner (display ID LRN-0042). */
export const MARIAM_N = 42

export const PERSONAS: readonly PersonaSeed[] = [
  {
    n: 1,
    fullName: 'Maha Al Nouri',
    organisation: 'Demo Pearl Hospitality',
    orgType: 'hotel_accommodation',
    jobTitle: 'Guest Relations Officer',
    jobFunction: 'guest_services',
    seniority: 'experienced_professional',
    experience: '4_7',
    language: 'English',
    goals: ['complaint_handling', 'communication'],
    weeklyMinutes: 60,
    country: 'Qatar',
    city: 'Doha',
    enrolments: [{ programme: 'B', stage: 'b_practice' }],
    note: 'B learner; baseline 40; needs service recovery practice',
  },
  {
    n: 2,
    fullName: 'Omar Al Safi',
    organisation: 'Demo Horizon Tours',
    orgType: 'tour_operator',
    jobTitle: 'Tour Guide',
    jobFunction: 'guiding',
    seniority: 'entry_level',
    experience: '1_3',
    language: 'Arabic',
    goals: ['guiding', 'visitor_welcome'],
    weeklyMinutes: 60,
    country: 'Qatar',
    city: 'Doha',
    enrolments: [{ programme: 'A', stage: 'l1_done_unbooked' }],
    note: 'A learner; Level 1 complete; eligible for booking',
  },
  {
    n: 3,
    fullName: 'Leila Rahman',
    organisation: 'Demo Heritage Venue',
    orgType: 'attraction_venue',
    jobTitle: 'Visitor Experience Supervisor',
    jobFunction: 'guest_services',
    seniority: 'supervisor',
    experience: '4_7',
    language: 'English',
    goals: ['storytelling', 'leadership'],
    weeklyMinutes: 30,
    country: 'Qatar',
    city: 'Doha',
    enrolments: [
      { programme: 'A', stage: 'l1_late' },
      { programme: 'B', stage: 'b_mid' },
    ],
    note: 'A and B; distinct progress in each',
  },
  {
    n: 4,
    fullName: 'Daniel Costa',
    organisation: 'Demo Gulf Palm Hotels',
    orgType: 'hotel_accommodation',
    jobTitle: 'Front Office Agent',
    jobFunction: 'front_office',
    seniority: 'experienced_professional',
    experience: '8_plus',
    language: 'English',
    goals: ['communication', 'complaint_handling'],
    weeklyMinutes: 60,
    country: 'Qatar',
    city: 'Doha',
    enrolments: [{ programme: 'A', stage: 'returned' }],
    note: 'A assignment returned for revision',
  },
  {
    n: 5,
    fullName: 'Sara Mansour',
    organisation: 'Demo City Mobility',
    orgType: 'transport',
    jobTitle: 'Customer Service Agent',
    jobFunction: 'transport',
    seniority: 'entry_level',
    experience: '1_3',
    language: 'English',
    goals: ['visitor_welcome'],
    weeklyMinutes: 30,
    country: 'Qatar',
    city: 'Doha',
    enrolments: [{ programme: 'B', stage: 'completed' }],
    note: 'B completed; pre 60 and post 100',
  },
  {
    n: MARIAM_N,
    fullName: 'Mariam Al Nuaimi',
    organisation: 'Demo Pearl Hospitality',
    orgType: 'hotel_accommodation',
    jobTitle: 'Guest Relations Officer',
    jobFunction: 'guest_services',
    seniority: 'experienced_professional',
    experience: '4_7',
    language: 'Arabic',
    goals: ['visitor_welcome', 'communication'],
    weeklyMinutes: 60,
    country: 'Qatar',
    city: 'Doha',
    // A: Level 1 done and booked on SES-T01-2 (pinned in sessions.ts). B: two of three lessons done.
    enrolments: [
      { programme: 'A', stage: 'l1_done' },
      { programme: 'B', stage: 'b_mid' },
    ],
    note: 'Unified record demo: A and B, completed B lesson, upcoming session, expiring credential',
    email: 'mariam.alnuaimi@example.com',
    externalLearnerId: 'CRM-0042',
  },
]

/** Pinned assessment outcomes. Correct = true means option B was chosen. */
export const PERSONA_SCORES = {
  // Maha: strong on verify and communicate, lowest on discover and recover (brief §9 example).
  1: {
    pre: {
      discover_needs: false,
      verify_information: true,
      communicate_clearly: true,
      recover_service: false,
      protect_information: false,
    },
  },
  // Sara: pre 60, post 100.
  5: {
    pre: {
      discover_needs: false,
      verify_information: true,
      communicate_clearly: true,
      recover_service: false,
      protect_information: true,
    },
    post: {
      discover_needs: true,
      verify_information: true,
      communicate_clearly: true,
      recover_service: true,
      protect_information: true,
    },
  },
} as const
