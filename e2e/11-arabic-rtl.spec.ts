import { expect, type Page, test } from '@playwright/test'
import { ACCOUNTS } from './support/env'
import { signInAs } from './support/ui'

/**
 * Arabic and right-to-left smoke (SPEC §3 and §4): the public site and the learner portal follow
 * the saved Arabic choice at phone, tablet and desktop widths, with no sideways page scroll. The
 * trainer and admin portals stay English and left-to-right while Arabic is saved. Each test has
 * its own browser, so it starts from the seed.
 */
const ARABIC_LETTERS = /[؀-ۿ]/
const WIDTHS = [390, 768, 1440] as const

type Screen = { name: string; path: string; who?: string }

const SCREENS: Screen[] = [
  { name: 'home', path: '/' },
  { name: 'programme page', path: '/programmes/A' },
  { name: 'sign-in', path: '/login' },
  { name: 'learner dashboard', path: '/learner', who: ACCOUNTS.mariam },
  { name: 'My Learning Record', path: '/learner/record', who: ACCOUNTS.mariam },
]

/** Saves Arabic as the portal language before the app loads (the app reads `qta-lang`). */
async function saveArabic(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('qta-lang', 'ar')
    } catch {
      // about:blank has no storage.
    }
  })
}

async function open(page: Page, screen: Screen) {
  if (screen.who) await signInAs(page, screen.who, screen.path)
  else await page.goto(screen.path)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout: 15_000 })
}

for (const width of WIDTHS) {
  test.describe(`Arabic at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    for (const screen of SCREENS) {
      test(screen.name, async ({ page }) => {
        await saveArabic(page)
        await open(page, screen)
        const html = page.locator('html')
        await expect(html).toHaveAttribute('dir', 'rtl')
        await expect(html).toHaveAttribute('lang', 'ar')
        await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(ARABIC_LETTERS)
        // Real Arabic content, not only the headline.
        // biome-ignore lint/performance/useDomNodeTextContent: line breaks between blocks matter to the patterns
        const body = (await page.locator('main').first().innerText()) ?? ''
        expect(body.match(/[؀-ۿ]+/g)?.length ?? 0).toBeGreaterThan(10)
        // The page never scrolls sideways (tables scroll in their own box).
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow, `horizontal page scroll at ${width}px`).toBeLessThanOrEqual(0)
      })
    }
  })
}

test('the trainer and admin portals stay English and left-to-right while Arabic is saved', async ({
  page,
}) => {
  await saveArabic(page)
  const html = page.locator('html')

  await signInAs(page, ACCOUNTS.trainer(1), '/trainer')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  await expect(html).toHaveAttribute('dir', 'ltr')
  await expect(html).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 }).first()).not.toHaveText(ARABIC_LETTERS)

  await signInAs(page, ACCOUNTS.admin, '/admin/manage/content')
  await expect(page.getByRole('heading', { name: 'Content Library' })).toBeVisible()
  await expect(html).toHaveAttribute('dir', 'ltr')
  await expect(html).toHaveAttribute('lang', 'en')

  // The saved choice comes back on the learner side.
  await signInAs(page, ACCOUNTS.mariam, '/learner')
  await expect(html).toHaveAttribute('dir', 'rtl')
  await expect(html).toHaveAttribute('lang', 'ar')
})
