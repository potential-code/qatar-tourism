import { type BrowserContextOptions, devices } from '@playwright/test'

/** Shared constants for the e2e walkthrough. The suite runs its own Vite dev server. */
export const CLIENT_PORT = Number(process.env.E2E_PORT ?? 5250)
export const CLIENT_URL = `http://127.0.0.1:${CLIENT_PORT}`
export const DEMO_PASSWORD = 'password'

/** Browser settings for every context: the config's `use` and the walkthrough's own context. */
export const CONTEXT_OPTIONS: BrowserContextOptions = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1440, height: 900 },
  baseURL: CLIENT_URL,
  timezoneId: 'Asia/Qatar',
  locale: 'en-GB',
  reducedMotion: 'reduce',
}

/** Seeded account ids, for the `?demo-as=<userId>` deep link. */
export const ACCOUNTS = {
  admin: 'user-admin',
  maha: 'user-l0001',
  omar: 'user-l0002',
  leila: 'user-l0003',
  daniel: 'user-l0004',
  sara: 'user-l0005',
  /** Mariam Al Nuaimi, LRN-0042: the 29 Oct unified-record demonstration learner. */
  mariam: 'user-l0042',
  trainer: (n: number) => `user-t${String(n).padStart(2, '0')}`,
} as const

const TRAINER_EMAILS = [
  'amal.alnouri@example.com',
  'khalid.mansour@example.com',
  'leila.haddad@example.com',
  'rafael.sousa@example.com',
  'noura.alsaleh@example.com',
  'priya.menon@example.com',
  'youssef.karim@example.com',
  'sofia.martins@example.com',
  'hassan.farouk@example.com',
  'aisha.rahman@example.com',
] as const

/** Seeded sign-in emails, for the journeys that use the real sign-in form. */
export const EMAILS = {
  admin: 'admin@example.com',
  maha: 'maha.alnouri@example.com',
  mariam: 'mariam.alnuaimi@example.com',
  /** T01–T10 in order: firstname.lastname@example.com. */
  trainer: (n: number) => TRAINER_EMAILS[n - 1] as string,
} as const
