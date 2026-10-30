import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { Role } from '@shared/roles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { PortalShell } from '@/components/layout/PortalShell'
import { leaveForcedLanguage, setAppLanguage } from '@/i18n'
import { actAs, freshDemo } from '@/services/__tests__/helpers'
import { OverviewPage } from '../components/OverviewPage'

// happy-dom's Web Animations stub rejects when motion cancels an animation on unmount. Without
// `Element.animate` motion falls back to its JavaScript animator, which behaves in tests.
Reflect.deleteProperty(Element.prototype, 'animate')

/** Mariam (LRN-0042) is enrolled in A and B and has finished her profile. */
const MARIAM = 'user-l0042'
const TRAINER = 'user-t01'

function mount(portal: Role, userId: string) {
  const db = freshDemo()
  actAs(db, userId)
  const root = createRootRoute({ component: () => <PortalShell portal={portal} /> })
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => (portal === 'learner' ? <OverviewPage /> : <p>Trainer overview</p>),
  })
  const router = createRouter({
    routeTree: root.addChildren([index]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(async () => {
  cleanup()
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
})

describe('learner portal in Arabic', () => {
  test('renders the shell and dashboard in Arabic with a right-to-left document', async () => {
    await setAppLanguage('ar')
    mount('learner', MARIAM)

    // Sidebar labels, header language switcher and dashboard copy are Arabic.
    expect(await screen.findByRole('link', { name: 'نظرة عامة' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'سجل تعلّمي' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'العربية' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    await waitFor(() => expect(screen.getByText(/مرحبًا بعودتك، Mariam/)).toBeDefined())
    expect(screen.getByRole('heading', { name: 'رحلتك' })).toBeDefined()

    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')
    // The sidebar opens from the start edge, which is the right in Arabic.
    expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute('data-side')).toBe('right')
  })

  test('the same dashboard in English keeps the original copy and LTR', async () => {
    mount('learner', MARIAM)
    expect(await screen.findByRole('link', { name: 'Overview' })).toBeDefined()
    await waitFor(() => expect(screen.getByText(/Welcome back, Mariam/)).toBeDefined())
    expect(screen.getByRole('heading', { name: 'Your journey' })).toBeDefined()
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute('data-side')).toBe('left')
  })
})

describe('trainer portal ignores the saved Arabic choice', () => {
  test('stays English and LTR, has no language switcher, and restores Arabic on leaving', async () => {
    await setAppLanguage('ar')
    expect(document.documentElement.dir).toBe('rtl')

    const view = mount('trainer', TRAINER)
    expect(await screen.findByRole('link', { name: 'My sessions' })).toBeDefined()
    await waitFor(() => expect(document.documentElement.dir).toBe('ltr'))
    expect(document.documentElement.lang).toBe('en')
    expect(screen.queryByRole('button', { name: 'العربية' })).toBeNull()
    expect(localStorage.getItem('qta-lang')).toBe('ar')

    // Leaving the trainer portal restores the learner's saved choice.
    view.unmount()
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'))
    expect(document.documentElement.lang).toBe('ar')
  })
})
