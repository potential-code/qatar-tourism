import { expect, test } from '@playwright/test'
import { ACCOUNTS } from './support/env'
import { switchTo } from './support/toolbar'
import { pageHeading, signInAs, signInWithForm } from './support/ui'

/**
 * Walkthrough 7–10 minutes (brief §17): Omar books a session, the facilitator switches to the
 * trainer, who reschedules it. Evidence: eligibility, capacity, My sessions update and the
 * simulated notification log, with the §11 success modal.
 */
test.describe.configure({ mode: 'serial' })

/** YYYY-MM-DD plus whole days. */
function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

const SESSION = 'Welcoming every visitor'
const SESSION_CODE = 'SES-T01-2'

test('7–10 min: Omar books, Amal reschedules, Omar sees the change', async ({ page }) => {
  // The presenter signs in once as the demo administrator and uses the demo toolbar.
  await signInWithForm(page, ACCOUNTS.admin, 'admin')
  await expect(page).toHaveURL(/\/admin/)
  await switchTo(page, 'Omar Al Safi', /\/learner/)

  await page.goto('/learner/sessions?programme=A')
  await expect(page.getByText('Level 1 complete. You are eligible to book.')).toBeVisible()
  const card = page.getByRole('button', { name: `${SESSION}, ${SESSION_CODE}. View details` })
  await expect(card).toContainText('19')
  await card.click()
  const details = page.getByRole('dialog', { name: SESSION })
  await expect(details.getByText('19 of 24 remaining')).toBeVisible()
  await details.getByRole('button', { name: 'Confirm booking' }).click()

  // My sessions updates at once and capacity drops by one seat.
  const bookings = page.getByRole('region', { name: 'Your bookings' })
  await expect(bookings.getByRole('heading', { name: SESSION })).toBeVisible()
  await expect(bookings.getByText('Confirmed')).toBeVisible()
  // The date follows the demo reference date (Day +2), so only the time is fixed.
  await expect(bookings.getByText(/, 09:00 to 10:00 Qatar time/)).toBeVisible()
  await expect(card).toContainText('You are booked')
  await expect(card).toContainText('18')

  // The facilitator switches to the session's trainer, who reschedules it.
  await switchTo(page, 'Amal Al Nouri', /\/trainer/)
  await page.goto('/trainer/sessions')
  await page
    .getByRole('link', { name: new RegExp(SESSION_CODE) })
    .first()
    .click()
  await expect(pageHeading(page)).toHaveText(SESSION)
  await page.getByRole('button', { name: 'Reschedule' }).click()
  const dialog = page.getByRole('dialog', { name: 'Reschedule session' })
  const dateInput = dialog.getByLabel('New date (Qatar)')
  const original = await dateInput.inputValue()
  const moved = addDays(original, 1)
  await dateInput.fill(moved)
  await dialog.getByLabel('Start time').fill('11:00')
  await dialog.getByLabel('End time').fill('12:00')
  await dialog.getByLabel('Reason').fill('The room is needed for an Academy briefing.')
  // The affected count shows before confirmation (brief §10): 5 seeded plus Omar.
  await expect(
    dialog.getByText('6 registered learners will receive an in-app notification'),
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Confirm reschedule' }).click()

  // The §11 success modal.
  const done = page.getByRole('dialog', { name: 'Session rescheduled.' })
  await expect(done).toContainText(
    'In-app notifications have been created for 6 registered learners. Demo emails have been generated in the notification log; no external emails were sent.',
  )
  await expect(done.getByText('Demo email, not sent')).toBeVisible()
  await expect(done.getByRole('link', { name: 'View affected learners' })).toBeVisible()
  await done.getByRole('link', { name: 'View notification log' }).click()

  // Simulated notification log: one event, one in-app notice and one demo email per learner.
  await expect(pageHeading(page)).toHaveText('Notification log')
  const messages = page.getByRole('region', {
    name: /^Messages for event evt-reschedule-SES-T01-2/,
  })
  await expect(
    messages.getByRole('row', { name: /L0002 Omar Al Safi In-app Delivered in app/ }),
  ).toBeVisible()
  await expect(
    messages.getByRole('row', { name: /L0002 Omar Al Safi Demo email Simulated: no email sent/ }),
  ).toBeVisible()
  await expect(page.getByText(/has moved from .* to .*11:00 Qatar time/).first()).toBeVisible()

  // Back as Omar: My sessions shows the new time and the bell holds the notice.
  await switchTo(page, 'Omar Al Safi', /\/learner/)
  await page.goto('/learner/sessions')
  await expect(bookings.getByText(/11:00 to 12:00 Qatar time/)).toBeVisible()
  await expect(bookings.getByText('Rescheduled by your trainer')).toBeVisible()
  await expect(
    bookings.getByText(/Reason: The room is needed for an Academy briefing/),
  ).toBeVisible()
  await page.getByRole('button', { name: /^Notifications, \d+ unread/ }).click()
  const bell = page.getByRole('dialog', { name: 'Notifications' })
  await expect(
    bell.getByRole('button', {
      name: /^Unread: Your session has been rescheduled.*Welcoming every visitor Hello Omar/,
    }),
  ).toBeVisible()
  await expect(bell).toContainText('No external emails are sent.')
})

test('9–10 min: cancelling a session keeps its history and tells every learner', async ({
  page,
}) => {
  await signInAs(page, ACCOUNTS.trainer(1), '/trainer/sessions')
  await page
    .getByRole('link', { name: /SES-T01-3/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'Cancel session' }).click()
  const dialog = page.getByRole('dialog', { name: 'Cancel this session?' })
  await expect(dialog).toContainText('The session and its history are kept.')
  await expect(
    dialog.getByText(/\d+ registered learners? will receive an in-app notification/),
  ).toBeVisible()
  await dialog.getByLabel('Reason').fill('The trainer is attending an Academy assessment day.')
  await dialog.getByRole('button', { name: 'Cancel session' }).click()

  // The equivalent §11 modal for a cancellation.
  const done = page.getByRole('dialog', { name: /^Session cancelled/ })
  await expect(done).toContainText('In-app notifications have been created for')
  await expect(done).toContainText('no external emails were sent')
  await done.getByRole('button', { name: 'Close' }).first().click()
  await expect(page.getByText('Cancelled', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reschedule' })).toHaveCount(0)
})
