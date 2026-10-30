import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { CONTENT_LANGUAGE_KEY } from '@/features/scorm-player/hooks/useContentLanguage'
import i18n, { leaveForcedLanguage, setAppLanguage } from '@/i18n'
import { actAs, freshDemo } from '@/services/__tests__/helpers'
import { XapiPlayer } from '../components/XapiPlayer'

/** The xAPI unit in the learner player: launch bridge, simulated LRS label, statements table. */

let db: ReturnType<typeof freshDemo>

beforeEach(() => {
  db = freshDemo()
  actAs(db, 'user-l0042')
  localStorage.removeItem(CONTENT_LANGUAGE_KEY)
})
afterEach(async () => {
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
  delete window.QTA_LRS
})

function renderPlayer() {
  const root = createRootRoute()
  const player = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <XapiPlayer code="C09" programme="B" title="Planning a visitor experience" />,
  })
  const path = createRoute({ getParentRoute: () => root, path: '/learner/learning' })
  const router = createRouter({
    routeTree: root.addChildren([player, path]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

describe('XapiPlayer', () => {
  test('is labelled as a simulated learning record store and lists the learner statements', async () => {
    renderPlayer()
    await screen.findByRole('button', { name: 'Launch' })
    expect(screen.getAllByText('Simulated learning record store').length).toBeGreaterThan(0)
    expect(screen.getByRole('table')).toBeDefined()
    expect(screen.getByRole('columnheader', { name: 'Verb' })).toBeDefined()
    // Mariam's seeded English statements are shown.
    expect(screen.getAllByText('completed').length).toBeGreaterThan(0)
  })

  test('launching installs the bridge; a statement sent through it is stored once', async () => {
    renderPlayer()
    fireEvent.click(await screen.findByRole('button', { name: 'Launch' }))
    await waitFor(() => expect(window.QTA_LRS).toBeDefined())
    const bridge = window.QTA_LRS
    expect(bridge?.actor.account).toBe('LRN-0042')
    expect(bridge?.activityId).toBe('https://lrs.demo.invalid/activities/pve-en-xapi')
    expect(document.querySelector('iframe')?.getAttribute('src')).toBe(
      '/content/pve-en-xapi/index.html',
    )

    const before = db.xapiStatements.length
    const statement = {
      id: crypto.randomUUID(),
      actor: {
        objectType: 'Agent' as const,
        name: 'Mariam Al Nuaimi',
        account: { homePage: 'https://academy.demo.invalid', name: 'LRN-0042' },
      },
      verb: { id: 'http://adlnet.gov/expapi/verbs/initialized' },
      object: { id: 'https://lrs.demo.invalid/activities/pve-en-xapi' },
    }
    await bridge?.sendStatement(statement)
    await bridge?.sendStatement(statement)
    expect(db.xapiStatements.length).toBe(before + 1)
    await bridge?.setState(
      'step-2',
      JSON.stringify({ v: 1, s: 'pve-bookmark-1', lang: 'en', step: 2 }),
    )
    const unit = db.unitProgress.find((u) => u.extra?.activePackageId === 'pve-en-xapi')
    expect(unit?.location).toBe('step-2')
  })

  test('English to Arabic mid-lesson maps the step and keeps both state documents', async () => {
    renderPlayer()
    fireEvent.click(await screen.findByRole('button', { name: 'Launch' }))
    await waitFor(() => expect(window.QTA_LRS).toBeDefined())
    await window.QTA_LRS?.setState(
      'step-3',
      JSON.stringify({ v: 1, s: 'pve-bookmark-1', lang: 'en', step: 3, dest: 'waterfront' }),
    )

    fireEvent.click(screen.getByRole('radio', { name: 'العربية' }))
    expect(
      await screen.findByText('Your progress has been saved. Open the Arabic version?'),
    ).toBeDefined()
    expect(screen.getByText('The Arabic version continues at step 3 of 4.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Open the Arabic version' }))
    await waitFor(() =>
      expect(document.querySelector('iframe')?.getAttribute('src')).toBe(
        '/content/pve-ar-xapi/index.html',
      ),
    )
    expect(window.QTA_LRS?.activityId).toBe('https://lrs.demo.invalid/activities/pve-ar-xapi')
    expect(window.QTA_LRS?.state?.location).toBe('step-3')
    expect(JSON.parse(window.QTA_LRS?.state?.suspendData ?? '{}')).toMatchObject({
      lang: 'ar',
      dest: 'waterfront',
    })
  })
})
