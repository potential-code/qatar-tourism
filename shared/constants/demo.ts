/**
 * The frontend-only demo (no server, no database). Every "Day +N" offset in the seed is relative
 * to the reference date, read in Qatar time. A build may override it with
 * `VITE_DEMO_REFERENCE_DATE` (see client/src/mocks/reference.ts).
 */
export const DEMO_REFERENCE_DATE = '2026-10-27'

/** Every seeded account (admin, trainers, learners) signs in with this password. */
export const DEMO_PASSWORD = 'password'
