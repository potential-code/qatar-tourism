/**
 * The demo accounts offered on the sign-in page and in the facilitator toolbar, in the order the
 * walkthrough uses them. Noor starts the journey; the others are "see this state" shortcuts
 * (brief §15 personas, then the 29 Oct unified-record learner). The seed test checks each one.
 * Purposes are translated under `auth:demo.learners.<key>`.
 */
export const DEMO_LEARNERS = [
  {
    key: 'persona-36',
    userId: 'user-l0036',
    name: 'Noor Haddad',
    email: 'noor.haddad@example.com',
  },
  {
    key: 'persona-1',
    userId: 'user-l0001',
    name: 'Maha Al Nouri',
    email: 'maha.alnouri@example.com',
  },
  {
    key: 'persona-2',
    userId: 'user-l0002',
    name: 'Omar Al Safi',
    email: 'omar.alsafi@example.com',
  },
  {
    key: 'persona-3',
    userId: 'user-l0003',
    name: 'Leila Rahman',
    email: 'leila.rahman@example.com',
  },
  {
    key: 'persona-4',
    userId: 'user-l0004',
    name: 'Daniel Costa',
    email: 'daniel.costa@example.com',
  },
  {
    key: 'persona-5',
    userId: 'user-l0005',
    name: 'Sara Mansour',
    email: 'sara.mansour@example.com',
  },
  {
    key: 'persona-42',
    userId: 'user-l0042',
    name: 'Mariam Al Nuaimi',
    email: 'mariam.alnuaimi@example.com',
  },
] as const

export type DemoLearner = (typeof DEMO_LEARNERS)[number]

/** T01 Amal Al Nouri, behind the sign-in page's trainer button. */
export const DEMO_TRAINER_EMAIL = 'amal.alnouri@example.com'

export const DEMO_ADMIN_EMAIL = 'admin@example.com'
