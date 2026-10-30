import type { DemoSettings } from '@shared/types/db'

/**
 * "Demo settings — subject to Qatar Tourism confirmation". Proposed values, not confirmed policy.
 * `db.settings` starts as a copy of this; a reset restores it.
 */
export const DEFAULT_DEMO_SETTINGS: DemoSettings = {
  seatOfferWindowHours: 24,
  credentialValidityMonths: 12,
  cpdTarget: 8,
  cpdUnit: 'hours',
  cpdHoursPerCredit: 1,
  reminderDaysBefore: [60, 30, 7],
  programmeBCpdEnabled: false,
  programmeBCpdPerCourse: 0.5,
}

/** CPD hours one Academy credential counts for. */
export const CPD_HOURS_PER_CREDENTIAL = 4
