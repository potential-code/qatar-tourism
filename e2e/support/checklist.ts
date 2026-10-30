import { sharedContextTest } from './walkthrough'

/**
 * The 29 Oct update checklist (SPEC §10) is one connected story in its own browser, separate from
 * the 01 to 08 walkthrough: Mariam's session, the clock, the waitlist and the CRM events carry
 * from one check to the next. The context is new for each run and starts from the seed.
 */
export const test = sharedContextTest()
export { expect } from '@playwright/test'
