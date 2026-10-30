import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { ILLUSTRATIVE_COPY } from '@/components/layout/IllustrativeNote'
import { actAs, freshDemo } from '@/services/__tests__/helpers'
import { CRM_COPY } from '@/services/crm/common'
import { IntegrationsTabs } from '../components/IntegrationsTabs'

// happy-dom cannot run native animations; ask for reduced motion so motion renders statically.
const originalMatchMedia = window.matchMedia
window.matchMedia = ((query: string) => ({
  matches: query.includes('prefers-reduced-motion'),
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia

afterAll(() => {
  window.matchMedia = originalMatchMedia
})

const renderTabs = (initialTab?: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <IntegrationsTabs initialTab={initialTab} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  const db = freshDemo()
  actAs(db, 'user-admin')
})

describe('Integrations and Security', () => {
  test('shows the exact illustrative configuration copy and the six tabs', () => {
    renderTabs()
    expect(screen.getByText(ILLUSTRATIVE_COPY)).toBeDefined()
    expect(ILLUSTRATIVE_COPY).toBe(
      'Illustrative configuration. Hosting region, access policies, SSO provider and API settings are configurable and subject to technical review. No live Qatar Tourism systems are connected.',
    )
    for (const name of [
      'Overview',
      'SSO',
      'API Access',
      'Content Hosting',
      'Data Residency',
      'CRM Integration',
    ]) {
      expect(screen.getByRole('tab', { name })).toBeDefined()
    }
  })

  test('the overview loads the access flow and the three previews', async () => {
    renderTabs()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Preview as learner/ })).toBeDefined(),
    )
    expect(screen.getByRole('button', { name: /Preview as external trainer/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Preview as signed-out visitor/ })).toBeDefined()
    expect(screen.getAllByText('Authorised content launch').length).toBeGreaterThan(0)
  })

  test('the CRM tab shows the exact two-way copy and its four sub-tabs', async () => {
    renderTabs('crm')
    expect(screen.getByText(CRM_COPY.banner)).toBeDefined()
    for (const name of ['Connection', 'Field Mapping', 'Event Flow', 'Sync Log']) {
      expect(screen.getByRole('tab', { name })).toBeDefined()
    }
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save demo configuration' })).toBeDefined(),
    )
    expect(screen.getByRole('button', { name: /Test connection/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Run demo sync/ })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Run scenario' })).toBeDefined()
  })

  test('the data residency rows default to To be confirmed', async () => {
    renderTabs('residency')
    await waitFor(() => expect(screen.getByLabelText('LMS records: status')).toBeDefined())
    for (const item of [
      'LMS records',
      'Uploaded content',
      'Backups',
      'Logs',
      'Learning record store',
      'AI and voice processing',
    ]) {
      expect(screen.getByLabelText(`${item}: status`).textContent).toContain('To be confirmed')
    }
  })
})
