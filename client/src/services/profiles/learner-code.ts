import { db } from '../api'

/**
 * Next free learner code (L1201, L1202, …) after the seeded L0001–L1200, for public
 * registration and admin-created learners alike. Writes are synchronous in the demo, so two
 * registrations can never take the same number.
 */
export function nextLearnerCode(): string {
  const max = db.profiles.reduce((highest, p) => {
    const n = Number.parseInt(p.learnerCode.slice(1), 10)
    return Number.isFinite(n) && n > highest ? n : highest
  }, 0)
  return `L${String(max + 1).padStart(4, '0')}`
}
