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
import i18n, { leaveForcedLanguage, setAppLanguage } from '@/i18n'
import { actAs, freshDemo } from '@/services/__tests__/helpers'
import * as scorm from '@/services/scorm.service'
import { LibraryScormPlayer } from '../components/LibraryScormPlayer'
import { CONTENT_LANGUAGE_KEY } from '../hooks/useContentLanguage'

/**
 * The learner's mid-lesson language switch end to end: launch the English package, change the
 * content language to Arabic, see the saved-progress prompt, confirm, and land on the Arabic
 * package at the equivalent screen, with the enrolment and the English bookmark intact.
 */

const EN = 'wvq-en-scorm2004'
const AR = 'wvq-ar-scorm2004'

beforeEach(() => {
  actAs(freshDemo(), 'user-l0042')
  localStorage.removeItem(CONTENT_LANGUAGE_KEY)
})
afterEach(async () => {
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
  delete window.API_1484_11
})

function renderPlayer() {
  const root = createRootRoute()
  const player = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => (
      <LibraryScormPlayer code="C08" programme="B" title="Welcoming visitors to Qatar" />
    ),
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

const frame = () => document.querySelector('iframe')

describe('LibraryScormPlayer', () => {
  test('follows the portal language by default and launches that package', async () => {
    renderPlayer()
    const launch = await screen.findByRole('button', { name: 'Launch' })
    expect(
      screen.getByRole('radio', { name: 'Use my portal language' }).getAttribute('aria-checked'),
    ).toBe('true')
    fireEvent.click(launch)
    await waitFor(() => expect(frame()).not.toBeNull())
    expect(frame()?.getAttribute('src')).toBe(`/content/${EN}/index.html`)
    expect(frame()?.getAttribute('lang')).toBe('en')
    expect(window.API_1484_11).toBeDefined()
  })

  test('the Arabic portal launches the Arabic package without touching the content control', async () => {
    await setAppLanguage('ar')
    renderPlayer()
    fireEvent.click(await screen.findByRole('button', { name: 'تشغيل' }))
    await waitFor(() => expect(frame()).not.toBeNull())
    expect(frame()?.getAttribute('src')).toBe(`/content/${AR}/index.html`)
    expect(frame()?.getAttribute('lang')).toBe('ar')
  })

  test('English to Arabic mid-lesson: saved, prompted, mapped to the same screen', async () => {
    renderPlayer()
    fireEvent.click(await screen.findByRole('button', { name: 'Launch' }))
    await waitFor(() => expect(frame()).not.toBeNull())

    // What the running English package has committed by screen 3.
    await scorm.commit('C08', {
      programme: 'B',
      launchId: 'launch-ui-0001',
      cmiCompletionStatus: 'incomplete',
      packageId: EN,
      location: 'screen-3',
      suspendData: JSON.stringify({
        v: 1,
        s: 'wvq-bookmark-1',
        lang: 'en',
        screen: 3,
        visited: [1, 2, 3],
      }),
    })

    fireEvent.click(screen.getByRole('radio', { name: 'العربية' }))
    expect(
      await screen.findByText('Your progress has been saved. Open the Arabic version?'),
    ).toBeDefined()
    expect(screen.getByText('The Arabic version continues at screen 3 of 5.')).toBeDefined()
    // Nothing has changed yet: the English frame is still the one running.
    expect(frame()?.getAttribute('src')).toBe(`/content/${EN}/index.html`)

    fireEvent.click(screen.getByRole('button', { name: 'Open the Arabic version' }))
    await waitFor(() => expect(frame()?.getAttribute('src')).toBe(`/content/${AR}/index.html`))
    expect(frame()?.getAttribute('lang')).toBe('ar')
    expect(localStorage.getItem(CONTENT_LANGUAGE_KEY)).toBe('ar')

    const ar = await scorm.getState('B', 'C08', AR)
    expect(ar.cmi.entry).toBe('resume')
    expect(ar.cmi.location).toBe('screen-3')
    expect((await scorm.getState('B', 'C08', EN)).cmi.location).toBe('screen-3')
    // The portal language did not change.
    expect(i18n.language).toBe('en')
  })

  test('cancelling the prompt keeps the English version running', async () => {
    renderPlayer()
    fireEvent.click(await screen.findByRole('button', { name: 'Launch' }))
    await waitFor(() => expect(frame()).not.toBeNull())
    fireEvent.click(screen.getByRole('radio', { name: 'العربية' }))
    await screen.findByText(/Open the Arabic version\?/)
    fireEvent.click(screen.getByRole('button', { name: 'Stay in this version' }))
    await waitFor(() => expect(screen.queryByText(/Open the Arabic version\?/)).toBeNull())
    expect(frame()?.getAttribute('src')).toBe(`/content/${EN}/index.html`)
    // The control is pinned to the version the learner is in.
    expect(screen.getByRole('radio', { name: 'English' }).getAttribute('aria-checked')).toBe('true')
  })

  test('with no equivalent position the prompt says the other version starts at the beginning', async () => {
    renderPlayer()
    fireEvent.click(await screen.findByRole('button', { name: 'Launch' }))
    await waitFor(() => expect(frame()).not.toBeNull())
    fireEvent.click(screen.getByRole('radio', { name: 'العربية' }))
    expect(await screen.findByText(/The Arabic version starts at the beginning\./)).toBeDefined()
  })
})
