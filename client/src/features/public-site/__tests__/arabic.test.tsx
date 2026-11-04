import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { DEMO_LEARNERS } from '@shared/constants'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { SignInPage } from '@/features/auth/components/SignInPage'
import i18n, { leaveForcedLanguage, resources, setAppLanguage } from '@/i18n'
import { freshDemo } from '@/services/__tests__/helpers'
import { Hero } from '../components/Hero'
import { PublicLayout } from '../components/PublicLayout'

/**
 * Arabic and RTL on the public site and the sign-in page (29 Oct update, lane A1). The pages
 * render inside a small memory router over the in-memory demo database, as in the app.
 */

// happy-dom lacks a few browser APIs the animated sections use.
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
Object.assign(globalThis, { IntersectionObserver: Observer, ResizeObserver: Observer })
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}
window.scrollTo = (() => {}) as typeof window.scrollTo
// Without Web Animations, motion animates in script and nothing rejects "animation canceled"
// when a test unmounts mid-transition.
Reflect.deleteProperty(Element.prototype, 'animate')

function mount(path: string, pages: Record<string, () => ReactNode>) {
  const root = createRootRoute({ component: Outlet })
  const routes = Object.entries(pages).map(([routePath, Page]) =>
    createRoute({ getParentRoute: () => root, path: routePath, component: Page }),
  )
  const router = createRouter({
    routeTree: root.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </QueryClientProvider>,
  )
  return router
}

beforeEach(async () => {
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
  freshDemo()
})

afterEach(async () => {
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
})

describe('public homepage', () => {
  const home = () => (
    <PublicLayout overlayHeader>
      <Hero />
    </PublicLayout>
  )

  test('English by default, then Arabic and right-to-left after the switch', async () => {
    mount('/', { '/': home, '/login': () => null, '/register': () => null })

    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading.textContent).toContain('Build the skills to create')
    expect(document.documentElement.dir).toBe('ltr')

    // The header switcher (desktop) and the one in the menu sheet are the same component.
    fireEvent.click(screen.getAllByRole('button', { name: 'العربية' })[0] as HTMLElement)

    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'))
    expect(document.documentElement.lang).toBe('ar')
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
        resources.ar.public.hero.headline.split(' ')[0] as string,
      ),
    )
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      resources.ar.public.hero.headline,
    )

    // Navigation, calls to action and the footer notice are Arabic too.
    const nav = screen.getAllByRole('navigation', { name: resources.ar.public.nav.main })[0]
    expect(nav?.textContent).toContain(resources.ar.public.nav.programmes)
    expect(nav?.textContent).toContain(resources.ar.public.nav.howItWorks)
    expect(screen.getByText(resources.ar.public.hero.secondary)).toBeDefined()
    expect(screen.getByText(resources.ar.public.demoNotice)).toBeDefined()

    // And back: English returns, left to right.
    fireEvent.click(screen.getAllByRole('button', { name: 'English' })[0] as HTMLElement)
    await waitFor(() => expect(document.documentElement.dir).toBe('ltr'))
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
        'Build the skills to create',
      ),
    )
  })
})

describe('sign-in page', () => {
  const page = () => <SignInPage />

  test('renders Arabic labels after switching language', async () => {
    mount('/login', { '/login': page, '/': () => null, '/register': () => null })
    await screen.findByLabelText('Email')

    fireEvent.click(screen.getAllByRole('button', { name: 'العربية' })[0] as HTMLElement)

    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'))
    expect(await screen.findByLabelText(resources.ar.auth.signIn.email)).toBeDefined()
    expect(screen.getByLabelText(resources.ar.auth.password.label)).toBeDefined()
    expect(screen.getByRole('button', { name: resources.ar.auth.signIn.submit })).toBeDefined()
    expect(screen.getByText(resources.ar.auth.signIn.forgot)).toBeDefined()
  })

  test('the learner demo button opens Noor, and every other demo learner is one click away', async () => {
    const db = freshDemo()
    mount('/login', {
      '/login': page,
      '/': () => null,
      '/register': () => null,
      '/onboarding': () => null,
      '/learner': () => null,
    })
    expect(await screen.findByText('noor.haddad@example.com')).toBeDefined()
    expect(screen.getByText(resources.en.auth.demo.learner.title)).toBeDefined()
    expect(screen.queryByText('omar.alsafi@example.com')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: resources.en.auth.demo.more.title }))
    for (const l of DEMO_LEARNERS.slice(1)) {
      expect(await screen.findByText(l.email)).toBeDefined()
      expect(screen.getByText(l.name)).toBeDefined()
      expect(screen.getByText(resources.en.auth.demo.learners[l.key].purpose)).toBeDefined()
    }

    fireEvent.click(screen.getByText('noor.haddad@example.com'))
    await waitFor(() => expect(db.session?.userId).toBe('user-l0036'))
  })

  test('the demo learner list is fully Arabic, with no missing keys', async () => {
    mount('/login', { '/login': page, '/': () => null, '/register': () => null })
    await screen.findByLabelText('Email')
    fireEvent.click(screen.getAllByRole('button', { name: 'العربية' })[0] as HTMLElement)
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'))

    expect(await screen.findByText(resources.ar.auth.demo.learner.title)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: resources.ar.auth.demo.more.title }))
    for (const l of DEMO_LEARNERS.slice(1)) {
      expect(await screen.findByText(resources.ar.auth.demo.learners[l.key].purpose)).toBeDefined()
    }
    expect(document.body.textContent).not.toMatch(/demo\.[a-z]/)
  })

  test('shows translated validation messages and still signs in from the Arabic form', async () => {
    const db = freshDemo()
    mount('/login', { '/login': page, '/': () => null, '/register': () => null })
    await screen.findByLabelText('Email')
    fireEvent.click(screen.getAllByRole('button', { name: 'العربية' })[0] as HTMLElement)
    const email = (await screen.findByLabelText(resources.ar.auth.signIn.email)) as HTMLInputElement
    const submit = screen.getByRole('button', { name: resources.ar.auth.signIn.submit })

    // Empty submit: the zod message key is shown in Arabic.
    fireEvent.click(submit)
    expect(await screen.findAllByText(resources.ar.auth.validation.email)).not.toHaveLength(0)

    fireEvent.change(email, { target: { value: 'mariam.alnuaimi@example.com' } })
    fireEvent.change(screen.getByLabelText(resources.ar.auth.password.label), {
      target: { value: 'password' },
    })
    fireEvent.click(submit)

    await waitFor(() => expect(db.session?.userId).toBeTruthy(), { timeout: 5000 })
  })
})
