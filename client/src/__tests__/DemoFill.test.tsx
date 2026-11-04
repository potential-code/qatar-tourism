import { afterEach, describe, expect, mock, test } from 'bun:test'
import { countWords } from '@shared/schemas/assignment-marking'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { SAMPLE_SUBMISSIONS, sampleSubmission } from '@/features/assignments/utils/sample-answers'
import { RegisterPage } from '@/features/auth/components/RegisterPage'
import { ExternalForm } from '@/features/learner-record/components/ExternalForm'
import { ProfileWizard } from '@/features/profile/wizard/ProfileWizard'
import { SessionFormPage } from '@/features/trainer-workspace/components/form/SessionFormPage'
import { findFreeSlot } from '@/features/trainer-workspace/utils/sample-answers'
import i18n, { leaveForcedLanguage, setAppLanguage } from '@/i18n'
import { actAs, freshDemo, TEST_REFERENCE_DATE } from '@/services/__tests__/helpers'
import { SAMPLE_EVIDENCE_NAME } from '@/services/credentials/sample-evidence'

// The wizard animates its steps; happy-dom cancels those animations noisily.
MotionGlobalConfig.skipAnimations = true

afterEach(async () => {
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
})

function renderWithApp(ui: ReactNode) {
  const root = createRootRoute({ component: () => <>{ui}</> })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>,
  )
}

const fillButton = () => screen.findByRole('button', { name: 'Fill with sample answers' })
const fieldValue = (label: string | RegExp) =>
  (screen.getByLabelText(label) as HTMLInputElement | HTMLTextAreaElement).value

describe('Fill with sample answers', () => {
  test('is a real non-submitting button described by its Demo hint', async () => {
    actAs(freshDemo(), null)
    renderWithApp(<RegisterPage />)
    const button = await fillButton()
    expect(button.getAttribute('type')).toBe('button')
    const hint = document.getElementById(button.getAttribute('aria-describedby') ?? '')
    expect(hint?.textContent).toContain('Demo')
  })

  test('profile wizard step 1: fills a seeded hotel and passes Continue', async () => {
    actAs(freshDemo(), 'user-l0036')
    renderWithApp(<ProfileWizard />)
    fireEvent.click(await fillButton())
    await waitFor(() => expect(fieldValue('Job title')).toBe('Front Office Agent'))
    // The picker closes on the chosen organisation and offers "Change".
    await screen.findByRole('button', { name: /change/i })
    fireEvent.click(screen.getByRole('button', { name: /^Continue/ }))
    await screen.findByRole('heading', { name: 'Where and how you learn' })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('register: a unique fictional email each click, and the account is created', async () => {
    const db = freshDemo()
    actAs(db, null)
    renderWithApp(<RegisterPage />)
    fireEvent.click(await fillButton())
    await waitFor(() => expect(fieldValue('Full name')).toBe('Layla Al Mansoori'))
    const first = fieldValue('Email')
    expect(first).toMatch(/^visitor-[a-z0-9]{6}@example\.com$/)
    fireEvent.click(await fillButton())
    await waitFor(() => expect(fieldValue('Email')).not.toBe(first))
    expect(fieldValue(/^Password/)).toBe('password')
    const email = fieldValue('Email')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(db.users.some((u) => u.email === email)).toBe(true))
  })

  test('register in Arabic: the Arabic sample name appears', async () => {
    await setAppLanguage('ar')
    actAs(freshDemo(), null)
    renderWithApp(<RegisterPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'املأ بإجابات نموذجية' }))
    await waitFor(() => expect(screen.getByDisplayValue('ليلى المنصوري')).toBeDefined())
  })

  test('external certificate: every field and the sample evidence pass, and it submits', async () => {
    actAs(freshDemo(), 'user-l0042')
    const onDone = mock(() => {})
    renderWithApp(<ExternalForm today={TEST_REFERENCE_DATE} onDone={onDone} />)
    fireEvent.click(await fillButton())
    await screen.findByText(SAMPLE_EVIDENCE_NAME)
    expect(fieldValue('Certificate title')).toBe('Food Safety in Hospitality, Level 2')
    expect(fieldValue('Issue date') < TEST_REFERENCE_DATE).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  test('session form: a free future slot that the service accepts', async () => {
    const db = freshDemo()
    actAs(db, 'user-t01')
    const before = db.sessions.length
    renderWithApp(<SessionFormPage />)
    fireEvent.click(await fillButton())
    await waitFor(() => expect(fieldValue('Room')).toBe('Training Room 2'))
    expect(fieldValue('Date (Qatar)')).not.toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    await waitFor(() => expect(db.sessions.length).toBe(before + 1))
    expect(db.sessions.at(-1)?.title).toContain('service recovery workshop')
  })
})

describe('sample content', () => {
  test('assignment samples meet the word limits in both languages', () => {
    const { PLAN_EN, PLAN_AR, SHORT_EN, SHORT_AR } = SAMPLE_SUBMISSIONS
    for (const plan of [PLAN_EN, PLAN_AR]) {
      expect(countWords(plan)).toBeGreaterThanOrEqual(300)
      expect(countWords(plan)).toBeLessThanOrEqual(500)
    }
    for (const short of [SHORT_EN, SHORT_AR]) {
      expect(countWords(short)).toBeGreaterThanOrEqual(100)
      expect(countWords(short)).toBeLessThanOrEqual(150)
    }
    const b = { wordMax: 150, allowsUpload: false }
    expect(sampleSubmission(b, 'ar')).toBe(SHORT_AR)
    expect(sampleSubmission({ wordMax: 500, allowsUpload: true }, 'en')).toBe(PLAN_EN)
  })

  test('the free slot skips a busy trainer slot and the Qatar weekend', () => {
    const now = '2026-10-27T06:00:00.000Z' // Tuesday in Qatar
    const free = findFreeSlot([], 'trainer-1', now)
    expect(free.date).toBe('2026-11-03')
    const busy = {
      trainer: { id: 'trainer-1' },
      startsAt: '2026-11-03T07:30:00.000Z',
      endsAt: '2026-11-03T09:00:00.000Z',
      status: 'published',
    }
    expect(findFreeSlot([busy], 'trainer-1', now).date).toBe('2026-11-04')
    expect(findFreeSlot([{ ...busy, status: 'cancelled' }], 'trainer-1', now).date).toBe(
      '2026-11-03',
    )
    // 2026-11-06 is a Friday: a clash on Thursday moves the slot to Sunday.
    const thursday = { ...busy, startsAt: '2026-11-05T07:00:00Z', endsAt: '2026-11-05T09:00:00Z' }
    expect(findFreeSlot([thursday], 'trainer-1', '2026-10-29T06:00:00Z').date).toBe('2026-11-08')
  })
})
