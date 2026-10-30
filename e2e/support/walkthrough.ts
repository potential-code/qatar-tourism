import { type BrowserContext, test as base, type Page } from '@playwright/test'
import { CONTEXT_OPTIONS } from './env'
import { SAVE_SETTLE_MS } from './ui'

/**
 * The brief §17 walkthrough is one connected story across roles. The demo keeps its data in
 * the browser (IndexedDB), so every walkthrough spec shares ONE browser context and page for the
 * whole run: what Omar books in 03 is what Amal marks in 04 and what the admin sees in 05.
 *
 * The context is new for each run, so it starts with empty storage and the app seeds the
 * snapshot on first load. Specs that need isolation (07, 09) use the plain `test` instead.
 */
export function sharedContextTest() {
  return base.extend<object, { walkthroughContext: BrowserContext; walkthroughPage: Page }>({
    walkthroughContext: [
      async ({ browser }, use) => {
        const context = await browser.newContext(CONTEXT_OPTIONS)
        // Belt and braces: start from the seed even if the browser ever reuses storage.
        // The flag lives in localStorage (shared by every tab of the context), so a tab opened later,
        // such as the certificate verification page, does not wipe the walkthrough's data.
        await context.addInitScript(() => {
          try {
            if (localStorage.getItem('qta-e2e-cleared')) return
            localStorage.clear()
            localStorage.setItem('qta-e2e-cleared', '1')
            indexedDB.deleteDatabase('qta-demo')
          } catch {
            // about:blank has no storage.
          }
        })
        await use(context)
        await context.close()
      },
      { scope: 'worker' },
    ],
    walkthroughPage: [
      async ({ walkthroughContext }, use) => {
        const page = await walkthroughContext.newPage()
        await use(page)
      },
      { scope: 'worker' },
    ],
    page: async ({ walkthroughPage }, use) => {
      await use(walkthroughPage)
      // Let the last change of each test reach IndexedDB before the next test reloads.
      await walkthroughPage.waitForTimeout(SAVE_SETTLE_MS)
    },
  })
}

/** The 01 to 08 walkthrough's browser. `e2e/10-update-checklist.spec.ts` makes its own. */
export const test = sharedContextTest()

export { expect } from '@playwright/test'
