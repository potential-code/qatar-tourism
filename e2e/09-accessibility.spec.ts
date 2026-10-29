import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { ACCOUNTS } from './support/env'
import { signInAs } from './support/ui'

/**
 * Accessibility pass (brief §18 "Quality and handover", "Accessibility and device review"):
 * axe-core WCAG 2.1 A/AA rules on every role's main screens, after the data has loaded.
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
/** Best-practice rules the brief's review asks for: one main landmark, heading order. */
const STRUCTURE_RULES = [
  'landmark-one-main',
  'landmark-no-duplicate-main',
  'page-has-heading-one',
  'heading-order',
]

type Target = { path: string; who?: string; width?: number }

const PUBLIC: Target[] = [
  { path: '/' },
  { path: '/programmes' },
  { path: '/programmes/A' },
  { path: '/programmes/B' },
  { path: '/programmes/C' },
  { path: '/sessions' },
  { path: '/trainers' },
  { path: '/trainers/T01' },
  { path: '/login' },
  { path: '/register' },
  { path: '/forgot-password' },
  { path: '/certificates/verify/QTA-DEMO-A-000001' },
]

const LEARNER: Target[] = [
  '/learner',
  '/learner/learning',
  '/learner/learning/path',
  '/learner/learning/C01',
  '/learner/learning/C02',
  '/learner/learning/C04',
  '/learner/assessments',
  '/learner/practice',
  '/learner/sessions',
  '/learner/assignments',
  '/learner/progress',
  '/learner/profile',
].map((path) => ({ path, who: ACCOUNTS.omar }))

const TRAINER: Target[] = [
  '/trainer',
  '/trainer/sessions',
  '/trainer/sessions/new',
  '/trainer/sessions/notification-log',
  '/trainer/learners',
  '/trainer/attendance',
  '/trainer/assignments',
  '/trainer/resources',
  '/trainer/profile',
].map((path) => ({ path, who: ACCOUNTS.trainer(1) }))

const ADMIN: Target[] = [
  '/admin',
  '/admin/ai-analytics',
  '/admin/reports',
  '/admin/reports/learners',
  '/admin/reports/sessions',
  '/admin/manage',
  '/admin/manage/users',
  '/admin/manage/trainers',
  '/admin/manage/programmes',
  '/admin/manage/paths',
  '/admin/manage/courses',
  '/admin/manage/assessments',
  '/admin/manage/sessions',
  '/admin/manage/roles',
  '/admin/manage/integrations',
  '/admin/manage/audit',
].map((path) => ({ path, who: ACCOUNTS.admin }))

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  // Skeletons gone: every data view has finished loading.
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout: 15_000 })
}

async function scan(page: Page, target: Target) {
  if (target.width) await page.setViewportSize({ width: target.width, height: 844 })
  if (target.who) await signInAs(page, target.who, target.path)
  else await page.goto(target.path)
  await settle(page)
  const wcag = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const structure = await new AxeBuilder({ page }).withRules(STRUCTURE_RULES).analyze()
  return [...wcag.violations, ...structure.violations]
    .map((v) => ({
      ...v,
      // Card buttons (data-a11y-card) keep a concise name that starts with their visible title,
      // which is what WCAG 2.5.3 asks; axe's experimental rule compares all of the card's text.
      nodes:
        v.id === 'label-content-name-mismatch'
          ? v.nodes.filter((n) => !n.html.includes('data-a11y-card'))
          : v.nodes,
    }))
    .filter((v) => v.nodes.length > 0)
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 5).map((n) => `${n.target.join(' ')} :: ${n.html.slice(0, 160)}`),
    }))
}

/** Phone width (brief §18 390 px) for the public, learner and trainer screens. */
const MOBILE: Target[] = [
  { path: '/' },
  { path: '/programmes/B' },
  { path: '/login' },
  { path: '/learner', who: ACCOUNTS.omar },
  { path: '/learner/sessions', who: ACCOUNTS.omar },
  { path: '/learner/progress', who: ACCOUNTS.omar },
  { path: '/trainer', who: ACCOUNTS.trainer(1) },
  { path: '/trainer/attendance', who: ACCOUNTS.trainer(1) },
].map((t) => ({ ...t, width: 390 }))

/** Tablet width (brief §18 768 px) for the public, learner and trainer screens. */
const TABLET: Target[] = [
  { path: '/' },
  { path: '/sessions' },
  { path: '/register' },
  { path: '/learner/learning/C01', who: ACCOUNTS.omar },
  { path: '/learner/assignments', who: ACCOUNTS.omar },
  { path: '/trainer/sessions', who: ACCOUNTS.trainer(1) },
  { path: '/trainer/assignments', who: ACCOUNTS.trainer(1) },
].map((t) => ({ ...t, width: 768 }))

for (const [group, targets] of Object.entries({
  PUBLIC,
  LEARNER,
  TRAINER,
  ADMIN,
  MOBILE,
  TABLET,
})) {
  test.describe(`axe: ${group.toLowerCase()}`, () => {
    for (const target of targets) {
      test(target.path, async ({ page }) => {
        const violations = await scan(page, target)
        expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
        if (target.width) {
          // Responsive layouts: the page never scrolls sideways (tables scroll in their own box).
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          )
          expect(overflow, `horizontal page scroll at ${target.width}px`).toBeLessThanOrEqual(0)
        }
      })
    }
  })
}

test.describe('keyboard operation', () => {
  test('skip link reaches the main content on the public site and in a portal', async ({
    page,
  }) => {
    await page.goto('/')
    await settle(page)
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('main#main')).toBeFocused()

    await signInAs(page, ACCOUNTS.omar, '/learner')
    await settle(page)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main#main')).toBeFocused()
  })

  test('sign-in mode is a keyboard radio group (arrow keys)', async ({ page }) => {
    await page.goto('/login')
    const learner = page.getByRole('radio', { name: 'Learner' })
    await learner.focus()
    await expect(learner).toBeChecked()
    // Held briefly, as a real key press is (Radix checks the radio that receives focus).
    await page.keyboard.press('ArrowRight', { delay: 50 })
    await expect(page.getByRole('radio', { name: 'Trainer' })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'Trainer' })).toBeFocused()
  })

  test('the path builder reorders items with the keyboard (dnd-kit alternative)', async ({
    page,
  }) => {
    await signInAs(page, ACCOUNTS.admin, '/admin/manage/paths')
    await settle(page)
    await page
      .getByRole('link', { name: /Hotel guest services/ })
      .first()
      .click()
    await settle(page)
    // A draft may already exist (an earlier walkthrough step or run): reuse it, else start one.
    const start = page.getByRole('button', { name: 'Edit as new draft' })
    const discardDraft = page.getByRole('button', { name: 'Discard draft' })
    await expect(start.or(discardDraft)).toBeVisible()
    if (await start.isVisible()) {
      await start.click()
      await expect(discardDraft).toBeVisible()
    }
    const handles = page.getByRole('button', { name: /^Reorder / })
    await expect(handles.first()).toBeVisible()
    const labels = () =>
      handles.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
    const before = await labels()
    await page.getByRole('button', { name: /^Reorder Welcoming every visitor/ }).focus()
    await page.keyboard.press('Space', { delay: 50 })
    await page.waitForTimeout(150)
    await page.keyboard.press('ArrowDown', { delay: 50 })
    await page.waitForTimeout(300)
    await page.keyboard.press('Space', { delay: 50 })
    await expect.poll(labels).not.toEqual(before)
    await expect(page.getByText('Unsaved changes').first()).toBeVisible()
    // Leave the published path untouched.
    await discardDraft.click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /Discard/ })
      .click()
  })

  test('a dialog traps focus, closes with Escape and returns focus to its trigger', async ({
    page,
  }) => {
    await signInAs(page, ACCOUNTS.admin, '/admin/manage/paths')
    await settle(page)
    const trigger = page.getByRole('button', { name: 'New path variant' }).first()
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('C01 video has an English captions track and a transcript', async ({ page }) => {
    await signInAs(page, ACCOUNTS.omar, '/learner/learning/C01')
    await settle(page)
    const track = page.locator('video track[kind="captions"][srclang="en"]')
    await expect(track).toHaveCount(1)
    const src = await track.getAttribute('src')
    const vtt = await page.request.get(src ?? '')
    expect((await vtt.text()).startsWith('WEBVTT')).toBe(true)
    await expect(page.getByRole('button', { name: 'Transcript' })).toBeVisible()
    await expect(page.getByText('A helpful welcome begins with attention.')).toBeVisible()
  })

  test('reduced motion: the global stylesheet stops transitions and animations', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await settle(page)
    const duration = await page
      .getByRole('link', { name: 'Skip to content' })
      .evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(['0s', '1e-05s', '0.00001s', '0.01ms']).toContain(duration)
  })
})
