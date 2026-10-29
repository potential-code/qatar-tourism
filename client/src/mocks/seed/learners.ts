import type {
  ExperienceBand,
  JobFunction,
  LearningGoal,
  OrganisationType,
  Seniority,
} from '@shared/constants'
import { LEARNING_GOALS } from '@shared/constants'
import { learnerCode, learnerEmail, userIds } from './ids'
import { type OrganisationSeed, PSEUDO_INDEPENDENT, PSEUDO_UNEMPLOYED } from './organisations'
import { PERSONAS } from './personas'
import type { Rng } from './rng'
import { TRAINERS } from './trainers'

/** Counts from brief §15. Organisation type and seniority are separate dimensions. */
export const LEARNER_TOTAL = 1200
export const ORG_TYPE_COUNTS = {
  hotel_accommodation: 420,
  tour_operator: 240,
  transport: 180,
  travel_trade: 120,
  attraction_venue: 120,
  // "independent/other" 120: independent 70 + other 50.
  independent: 70,
  other: 50,
} as const satisfies Partial<Record<OrganisationType, number>>

export const SENIORITY_COUNTS = {
  student_trainee: 180,
  entry_level: 300,
  experienced_professional: 420,
  supervisor: 180,
  // "manager/senior leader" 120: manager 70 + senior leader 50.
  manager: 70,
  senior_leader: 50,
} as const satisfies Partial<Record<Seniority, number>>

export const GROUP_COUNTS = { A: 360, B: 600, C: 180, AB: 60 } as const

export type Group = 'A' | 'B' | 'C' | 'AB'

export type LearnerSeed = {
  n: number
  userId: string
  code: string
  email: string
  fullName: string
  group: Group
  orgType: OrganisationType
  organisation: OrganisationSeed
  jobTitle: string
  jobFunction: JobFunction
  seniority: Seniority
  experience: ExperienceBand
  country: string
  city: string
  language: string
  goals: LearningGoal[]
  weeklyMinutes: 15 | 30 | 60 | 120
  captions: boolean
  accessibilityRequest: string | null
  marketingOptIn: boolean
  /** A draft profile has the goals/availability step unfinished. */
  profileComplete: boolean
  persona: boolean
}

const FIRST_NAMES = [
  'Fatima',
  'Yousef',
  'Mariam',
  'Hamad',
  'Noor',
  'Abdullah',
  'Aisha',
  'Ibrahim',
  'Reem',
  'Tariq',
  'Hind',
  'Salem',
  'Dana',
  'Jassim',
  'Lina',
  'Rashid',
  'Mona',
  'Faisal',
  'Huda',
  'Nasser',
  'Priya',
  'Arjun',
  'Anika',
  'Rohan',
  'Divya',
  'Vikram',
  'Sunita',
  'Imran',
  'Zainab',
  'Bilal',
  'Maria',
  'Jose',
  'Angela',
  'Miguel',
  'Grace',
  'Paolo',
  'Rosa',
  'Daniel',
  'Elena',
  'Marco',
  'Sofia',
  'Lucas',
  'Emma',
  'James',
  'Olivia',
  'Thomas',
  'Claire',
  'Henry',
  'Nadia',
  'Karim',
  'Amira',
  'Sami',
  'Rania',
  'Walid',
  'Yasmin',
  'Khaled',
  'Layla',
  'Hassan',
  'Samira',
  'Adel',
  'Ayesha',
  'Farhan',
  'Meera',
  'Sanjay',
  'Joy',
  'Ramon',
  'Chloe',
  'Nikhil',
  'Tamara',
  'Ali',
]

const LAST_NAMES = [
  'Al Marri',
  'Al Thani',
  'Al Kuwari',
  'Al Naimi',
  'Al Sulaiti',
  'Al Mohannadi',
  'Al Hajri',
  'Al Dosari',
  'Al Ansari',
  'Al Kaabi',
  'Haddad',
  'Khoury',
  'Nasser',
  'Saleh',
  'Farah',
  'Mahmoud',
  'Hussein',
  'Aziz',
  'Darwish',
  'Jaber',
  'Sharma',
  'Patel',
  'Nair',
  'Reddy',
  'Khan',
  'Siddiqui',
  'Ahmed',
  'Chowdhury',
  'Menon',
  'Iyer',
  'Santos',
  'Fernandes',
  'Garcia',
  'Reyes',
  'Cruz',
  'Lopez',
  'Silva',
  'Pereira',
  'Rossi',
  'Novak',
  'Bennett',
  'Walker',
  'Hughes',
  'Moreau',
  'Dubois',
  'Okafor',
  'Mensah',
  'Abebe',
  'Hamdan',
  'Zahran',
  'Sabbagh',
  'Tahir',
  'Yilmaz',
  'Demir',
  'Costa Lima',
  'Almeida',
  'Dias',
  'Basu',
  'Kapoor',
  'Gill',
  'Ortiz',
  'Mendoza',
  'Bautista',
  'Tan',
  'Lim',
  'Rahimi',
  'Karimi',
  'Barakat',
  'Issa',
  'Khalil',
]

const FUNCTION_LABEL: Record<JobFunction, string> = {
  guest_services: 'Guest Services',
  front_office: 'Front Office',
  guiding: 'Guiding',
  transport: 'Transport',
  sales: 'Sales',
  operations: 'Operations',
  training: 'Training',
  management: 'Management',
  other: 'Visitor Support',
}

const ROLE_NOUNS: Record<JobFunction, readonly string[]> = {
  guest_services: [
    'Guest Services Agent',
    'Guest Relations Officer',
    'Concierge',
    'Guest Experience Associate',
  ],
  front_office: ['Front Office Agent', 'Receptionist', 'Reservations Agent', 'Night Auditor'],
  guiding: ['Tour Guide', 'Desert Safari Guide', 'Cultural Guide', 'Heritage Interpreter'],
  transport: ['Driver', 'Customer Service Agent', 'Dispatch Coordinator', 'Station Host'],
  sales: ['Sales Executive', 'Travel Consultant', 'Booking Specialist', 'Account Coordinator'],
  operations: [
    'Operations Coordinator',
    'Guest Operations Associate',
    'Logistics Coordinator',
    'Duty Officer',
  ],
  training: [
    'Learning Coordinator',
    'Service Trainer',
    'Onboarding Specialist',
    'Training Assistant',
  ],
  management: [
    'Operations Executive',
    'Business Analyst',
    'Project Coordinator',
    'Quality Officer',
  ],
  other: [
    'Visitor Support Officer',
    'Events Assistant',
    'Community Liaison',
    'Information Desk Agent',
  ],
}

const FUNCTION_WEIGHTS: Record<OrganisationType, readonly (readonly [JobFunction, number])[]> = {
  hotel_accommodation: [
    ['guest_services', 30],
    ['front_office', 25],
    ['operations', 15],
    ['management', 10],
    ['sales', 8],
    ['training', 7],
    ['other', 5],
  ],
  tour_operator: [
    ['guiding', 40],
    ['sales', 20],
    ['operations', 20],
    ['guest_services', 10],
    ['management', 10],
  ],
  transport: [
    ['transport', 55],
    ['operations', 20],
    ['guest_services', 10],
    ['management', 10],
    ['other', 5],
  ],
  travel_trade: [
    ['sales', 45],
    ['operations', 20],
    ['guest_services', 15],
    ['management', 10],
    ['training', 10],
  ],
  attraction_venue: [
    ['guest_services', 35],
    ['guiding', 25],
    ['operations', 20],
    ['front_office', 10],
    ['management', 10],
  ],
  public_sector: [
    ['operations', 40],
    ['management', 30],
    ['other', 30],
  ],
  education: [
    ['training', 60],
    ['management', 20],
    ['other', 20],
  ],
  independent: [
    ['guiding', 40],
    ['sales', 15],
    ['training', 15],
    ['other', 30],
  ],
  other: [
    ['other', 40],
    ['training', 20],
    ['operations', 20],
    ['management', 20],
  ],
}

const EXPERIENCE_WEIGHTS: Record<Seniority, readonly (readonly [ExperienceBand, number])[]> = {
  student_trainee: [
    ['lt_1', 70],
    ['1_3', 30],
  ],
  entry_level: [
    ['lt_1', 35],
    ['1_3', 55],
    ['4_7', 10],
  ],
  experienced_professional: [
    ['1_3', 20],
    ['4_7', 50],
    ['8_plus', 30],
  ],
  supervisor: [
    ['4_7', 55],
    ['8_plus', 45],
  ],
  manager: [
    ['4_7', 35],
    ['8_plus', 65],
  ],
  senior_leader: [['8_plus', 100]],
  independent_professional: [
    ['4_7', 50],
    ['8_plus', 50],
  ],
}

const LOCATIONS: readonly (readonly [country: string, city: string, weight: number])[] = [
  ['Qatar', 'Doha', 60],
  ['Qatar', 'Lusail', 8],
  ['Qatar', 'Al Khor', 4],
  ['Qatar', 'Al Wakrah', 5],
  ['Qatar', 'Al Rayyan', 5],
  ['India', 'Kochi', 3],
  ['Philippines', 'Manila', 3],
  ['Egypt', 'Cairo', 3],
  ['Jordan', 'Amman', 2],
  ['Pakistan', 'Lahore', 2],
  ['United Kingdom', 'Manchester', 2],
  ['Portugal', 'Porto', 1],
  ['Lebanon', 'Beirut', 2],
]

const LANGUAGES: readonly (readonly [string, number])[] = [
  ['English', 50],
  ['Arabic', 34],
  ['Hindi', 5],
  ['Urdu', 4],
  ['French', 3],
  ['Tagalog', 4],
]

const ACCESSIBILITY_NOTES = [
  'Prefers transcripts for all video.',
  'Needs extra time on timed activities.',
  'Uses a screen reader.',
  'Prefers high-contrast display.',
]

function jobTitleFor(rng: Rng, fn: JobFunction, seniority: Seniority): string {
  const label = FUNCTION_LABEL[fn]
  const nouns = ROLE_NOUNS[fn]
  switch (seniority) {
    case 'student_trainee':
      return `${label} Trainee`
    case 'entry_level':
      return rng.pick(nouns.slice(0, 2))
    case 'experienced_professional':
      return rng.pick(nouns.slice(1))
    case 'supervisor':
      return `${label} Supervisor`
    case 'manager':
      return `${label} Manager`
    case 'senior_leader':
      return `Director of ${label}`
    case 'independent_professional':
      return rng.pick(nouns)
  }
}

function expandCounts<T extends string>(counts: Partial<Record<T, number>>): T[] {
  return (Object.entries(counts) as [T, number][]).flatMap(([key, count]) =>
    Array.from({ length: count }, () => key),
  )
}

/** Removes one occurrence of `value`; throws if the pool cannot supply it. */
function takeOne<T>(pool: T[], value: T): void {
  const index = pool.indexOf(value)
  if (index === -1)
    throw new Error(`Seed distribution cannot satisfy persona value ${String(value)}`)
  pool.splice(index, 1)
}

/**
 * Builds the 1,200 learners. Distribution counts are exact: the pools are built from the §15
 * numbers, personas remove their own values first, and the remainder is shuffled onto
 * learners 6..1200.
 */
export function buildLearners(
  rootRng: Rng,
  organisations: readonly OrganisationSeed[],
): LearnerSeed[] {
  const rng = rootRng.fork('learners')
  const orgByName = new Map(organisations.map((org) => [org.name, org]))
  const orgsByType = new Map<OrganisationType, OrganisationSeed[]>()
  for (const org of organisations) {
    if (org.isPseudo) continue
    const list = orgsByType.get(org.type) ?? []
    list.push(org)
    orgsByType.set(org.type, list)
  }

  const typePool = rng.fork('type').shuffle(expandCounts<OrganisationType>(ORG_TYPE_COUNTS))
  const seniorityPool = rng.fork('seniority').shuffle(expandCounts<Seniority>(SENIORITY_COUNTS))
  const groupPool: Group[] = [
    ...Array.from({ length: GROUP_COUNTS.A }, () => 'A' as const),
    ...Array.from({ length: GROUP_COUNTS.B }, () => 'B' as const),
    ...Array.from({ length: GROUP_COUNTS.C }, () => 'C' as const),
    ...Array.from({ length: GROUP_COUNTS.AB }, () => 'AB' as const),
  ]

  const personaGroup = (n: number): Group => {
    const persona = PERSONAS.find((p) => p.n === n)
    if (!persona) throw new Error(`No persona ${n}`)
    const programmes = persona.enrolments.map((e) => e.programme)
    return programmes.length === 2 ? 'AB' : (programmes[0] as 'A' | 'B')
  }

  // Personas consume their own share of each pool before the shuffle is dealt out.
  for (const persona of PERSONAS) {
    takeOne(typePool, persona.orgType)
    takeOne(seniorityPool, persona.seniority)
    takeOne(groupPool, personaGroup(persona.n))
  }
  const groups = rng.fork('group').shuffle(groupPool)

  const usedNames = new Set<string>([
    ...PERSONAS.map((p) => p.fullName),
    ...TRAINERS.map((t) => t.fullName),
  ])
  const nameRng = rng.fork('names')
  const nextName = () => {
    for (let attempt = 0; attempt < 500; attempt++) {
      const name = `${nameRng.pick(FIRST_NAMES)} ${nameRng.pick(LAST_NAMES)}`
      if (!usedNames.has(name)) {
        usedNames.add(name)
        return name
      }
    }
    throw new Error('Could not generate a unique learner name')
  }

  const attrRng = rng.fork('attributes')
  const learners: LearnerSeed[] = []

  for (let n = 1; n <= LEARNER_TOTAL; n++) {
    const persona = PERSONAS.find((p) => p.n === n)
    const orgType = persona ? persona.orgType : (typePool.pop() as OrganisationType)
    const seniority = persona ? persona.seniority : (seniorityPool.pop() as Seniority)
    const group = persona ? personaGroup(n) : (groups.pop() as Group)

    let organisation: OrganisationSeed
    if (persona) {
      const org = orgByName.get(persona.organisation)
      if (!org) throw new Error(`Unknown persona organisation ${persona.organisation}`)
      organisation = org
    } else if (orgType === 'independent') {
      organisation = orgByName.get(PSEUDO_INDEPENDENT) as OrganisationSeed
    } else if (orgType === 'other' && attrRng.chance(0.5)) {
      organisation = orgByName.get(PSEUDO_UNEMPLOYED) as OrganisationSeed
    } else {
      organisation = attrRng.pick(orgsByType.get(orgType) ?? [])
    }

    const jobFunction = persona
      ? persona.jobFunction
      : attrRng.weighted([...FUNCTION_WEIGHTS[orgType]])
    const experience = persona
      ? persona.experience
      : attrRng.weighted([...EXPERIENCE_WEIGHTS[seniority]])
    const jobTitle = persona ? persona.jobTitle : jobTitleFor(attrRng, jobFunction, seniority)
    const [country, city] = persona
      ? [persona.country, persona.city]
      : (() => {
          const [c, ci] = attrRng.weighted(
            LOCATIONS.map((l) => [[l[0], l[1]] as const, l[2]] as const),
          )
          return [c, ci]
        })()
    const goalCount = attrRng.weighted([
      [1, 25],
      [2, 45],
      [3, 30],
    ] as const)
    const goals = persona ? persona.goals : attrRng.sample(LEARNING_GOALS, goalCount)

    learners.push({
      n,
      userId: userIds.learner(n),
      code: learnerCode(n),
      email: learnerEmail(n),
      fullName: persona ? persona.fullName : nextName(),
      group,
      orgType,
      organisation,
      jobTitle,
      jobFunction,
      seniority,
      experience,
      country,
      city,
      language: persona ? persona.language : attrRng.weighted([...LANGUAGES]),
      goals,
      weeklyMinutes: persona
        ? persona.weeklyMinutes
        : attrRng.weighted([
            [15, 15],
            [30, 35],
            [60, 35],
            [120, 15],
          ] as const),
      captions: attrRng.chance(0.25),
      accessibilityRequest: attrRng.chance(0.04) ? attrRng.pick(ACCESSIBILITY_NOTES) : null,
      marketingOptIn: attrRng.chance(0.4),
      // plan.ts marks some not-started learners as draft profiles (brief §4).
      profileComplete: true,
      persona: Boolean(persona),
    })
  }

  return learners
}
