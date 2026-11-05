import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { AssignmentsPage } from '@/features/assignments/components/AssignmentsPage'
import { SessionSetup } from '@/features/roleplay/components/SessionSetup'
import { defaultEnrolmentId, mentionsCertification } from '@/features/roleplay/utils/programme'
import i18n from '@/i18n'
import { actAs, freshDemo } from '@/services/__tests__/helpers'
import { getOverview } from '@/services/roleplay.service'

MotionGlobalConfig.skipAnimations = true

/** Enrolled in Program A and Program B in the seed. */
const DUAL = 'user-l0070'
const STORAGE_KEY = 'qta.learner.programme'

beforeEach(() => {
  actAs(freshDemo(), DUAL)
})

afterEach(() => {
  localStorage.clear()
})

function renderAt(ui: ReactNode, url = '/') {
  const root = createRootRoute({ component: () => <>{ui}</> })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: [url] }),
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

describe('Assignments follow the active programme', () => {
  test('viewing B (switcher choice, no ?programme) shows only B and no upload rules', async () => {
    localStorage.setItem(STORAGE_KEY, 'B')
    renderAt(<AssignmentsPage />)
    expect(await screen.findByText('Short visitor response')).toBeTruthy()
    expect(screen.queryByText('Visitor service response plan')).toBeNull()
    expect(screen.getByText('Showing Program B assignments.')).toBeTruthy()
    expect(screen.queryByText('Uploads')).toBeNull()
    expect(screen.queryByText(/accepts PDF or DOCX/)).toBeNull()
  })

  test('viewing A shows only A, with the Program A upload rules', async () => {
    localStorage.setItem(STORAGE_KEY, 'A')
    renderAt(<AssignmentsPage />)
    expect(await screen.findByText('Visitor service response plan')).toBeTruthy()
    expect(screen.queryByText('Short visitor response')).toBeNull()
    expect(screen.getByText('Uploads')).toBeTruthy()
    expect(screen.getByText(/Program A accepts PDF or DOCX/)).toBeTruthy()
  })

  test('?programme= wins over the stored choice', async () => {
    localStorage.setItem(STORAGE_KEY, 'A')
    renderAt(<AssignmentsPage />, '/?programme=B')
    expect(await screen.findByText('Short visitor response')).toBeTruthy()
    expect(screen.queryByText('Visitor service response plan')).toBeNull()
  })
})

describe('practice setup', () => {
  test('a learner viewing B records the practice in B by default', async () => {
    const overview = await getOverview()
    const scenario = overview.scenarios[0]
    if (!scenario) throw new Error('no scenarios')
    let started = ''
    renderAt(
      <SessionSetup
        scenario={scenario}
        enrolments={overview.enrolments}
        programme="B"
        onStart={(choice) => {
          started = choice.enrolmentId
        }}
      />,
    )
    const button = await screen.findByRole('button', { name: 'Start conversation' })
    fireEvent.click(button)
    expect(started).toBe(overview.enrolments.find((e) => e.programmeCode === 'B')?.id ?? 'none')
  })
})

describe('practice programme helpers', () => {
  const enrolments = [
    { id: 'enr-a', programmeCode: 'A', programmeTitle: 'Program A', status: 'in_progress' },
    { id: 'enr-b', programmeCode: 'B', programmeTitle: 'Program B', status: 'in_progress' },
  ] as Parameters<typeof defaultEnrolmentId>[0]

  test('"Record this practice in" defaults to the active programme', () => {
    expect(defaultEnrolmentId(enrolments, 'B')).toBe('enr-b')
    expect(defaultEnrolmentId(enrolments, 'A')).toBe('enr-a')
  })

  test('falls back to the first enrolment, or nothing', () => {
    expect(defaultEnrolmentId(enrolments, null)).toBe('enr-a')
    expect(defaultEnrolmentId(enrolments, 'C')).toBe('enr-a')
    expect(defaultEnrolmentId([], 'B')).toBe('')
  })

  test('Program B practice copy never mentions certification', () => {
    expect(mentionsCertification('B')).toBe(false)
    expect(mentionsCertification('A')).toBe(true)
  })
})
