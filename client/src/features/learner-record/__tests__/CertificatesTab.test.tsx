import { afterEach, describe, expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n, { leaveForcedLanguage, setAppLanguage } from '@/i18n'
import type { LearnerRecord } from '@/services/credentials/learner-record.service'
import type { CredentialView } from '@/services/credentials/lifecycle'
import { CertificatesTab } from '../components/CertificatesTab'
import { HistoryTable } from '../components/HistoryTable'

afterEach(async () => {
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
})

const credential = (
  code: string,
  lifecycle: CredentialView['lifecycle'],
  overrides: Partial<CredentialView> = {},
): CredentialView => ({
  id: `id-${code}`,
  code,
  learnerId: 'user-l0042',
  learnerCode: 'L0042',
  learnerDisplayId: 'LRN-0042',
  learnerName: 'Mariam Al Nuaimi',
  programmeCode: 'A',
  programmeTitle: 'Tourism Service Professional',
  lifecycle,
  issuedAt: '2025-11-21T05:00:00.000Z',
  expiresAt: '2026-11-21T05:00:00.000Z',
  daysToExpiry: lifecycle === 'expiring_soon' ? 25 : lifecycle === 'active' ? 200 : -10,
  cpdHours: 4,
  ruleVersion: 'A-cert-v1',
  supersedesCode: null,
  supersededByCode: lifecycle === 'superseded' ? 'QTA-DEMO-A-000200' : null,
  revokedAt: null,
  revokeReason: null,
  renewal: null,
  nextAction:
    lifecycle === 'expiring_soon'
      ? 'renewal_due'
      : lifecycle === 'expired'
        ? 'retraining'
        : lifecycle === 'superseded'
          ? 'renewed'
          : lifecycle === 'revoked'
            ? 'revoked'
            : 'none',
  priorCycle: false,
  ...overrides,
})

const record: LearnerRecord = {
  today: '2026-10-27',
  learner: {
    userId: 'user-l0042',
    name: 'Mariam Al Nuaimi',
    displayId: 'LRN-0042',
    crmId: 'CRM-0042',
  },
  programmes: [
    {
      code: 'A',
      title: 'Tourism Service Professional',
      certificationEnabled: true,
      enrolmentStatus: 'in_progress',
    },
    {
      code: 'B',
      title: 'Everyday Service Skills',
      certificationEnabled: false,
      enrolmentStatus: 'in_progress',
    },
  ],
  history: [
    {
      id: 'unit:b1',
      kind: 'course',
      programmeCode: 'B',
      programmeTitle: 'Everyday Service Skills',
      title: 'Welcoming every visitor',
      mode: 'video',
      startedAt: '2026-09-19T14:16:33.722Z',
      completedAt: '2026-09-19T14:16:33.722Z',
      sortAt: '2026-09-19T14:16:33.722Z',
      progressPercent: 100,
      result: { kind: 'completed_no_certificate' },
      status: 'completed',
      detail: { attempts: [], feedback: [], evidence: [] },
    },
  ],
  credentials: [
    credential('QTA-DEMO-A-000001', 'active'),
    credential('QTA-DEMO-A-000002', 'expiring_soon'),
    credential('QTA-DEMO-A-000003', 'expired'),
    credential('QTA-DEMO-A-000004', 'revoked'),
    credential('QTA-DEMO-A-000005', 'superseded'),
  ],
  cpd: { unit: 'hours', target: 8, earned: 6, pending: 1.5, remaining: 2, lines: [] },
  external: [],
  licence: { tracked: true, status: 'active', source: 'crm', pendingRequest: null },
}

function renderWithApp(ui: ReactNode) {
  const root = createRootRoute({ component: () => <>{ui}</> })
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const client = new QueryClient()
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>,
  )
}

const card = (code: string) => screen.getByRole('article', { name: new RegExp(code) })

describe('credential wallet', () => {
  test('shows a clear text label on every credential and the right actions', async () => {
    renderWithApp(<CertificatesTab record={record} />)
    await screen.findByText('QTA-DEMO-A-000001')

    const labels: [string, string][] = [
      ['QTA-DEMO-A-000001', 'Active'],
      ['QTA-DEMO-A-000002', 'Expiring soon'],
      ['QTA-DEMO-A-000003', 'Expired'],
      ['QTA-DEMO-A-000004', 'Revoked'],
      ['QTA-DEMO-A-000005', 'Superseded'],
    ]
    for (const [code, label] of labels) {
      expect(within(card(code)).getByText(label)).toBeDefined()
      expect(within(card(code)).getByRole('link', { name: /View certificate/ })).toBeDefined()
      expect(within(card(code)).getByRole('button', { name: /Download demo PDF/ })).toBeDefined()
    }

    // Start renewal only where it applies; never on an active, revoked or superseded credential.
    expect(
      within(card('QTA-DEMO-A-000002')).getByRole('button', { name: 'Start renewal' }),
    ).toBeDefined()
    expect(
      within(card('QTA-DEMO-A-000003')).getByRole('button', { name: 'Start renewal' }),
    ).toBeDefined()
    for (const code of ['QTA-DEMO-A-000001', 'QTA-DEMO-A-000004', 'QTA-DEMO-A-000005']) {
      expect(within(card(code)).queryByRole('button', { name: /renewal/i })).toBeNull()
    }
    expect(within(card('QTA-DEMO-A-000002')).getByText(/Renewal due/)).toBeDefined()
    expect(
      within(card('QTA-DEMO-A-000005')).getAllByText(/QTA-DEMO-A-000200/).length,
    ).toBeGreaterThan(0)
  })

  test('keeps Program B certificate-free, the licence separate and the CPD ledger visible', async () => {
    renderWithApp(<CertificatesTab record={record} />)
    await screen.findByText('QTA-DEMO-A-000001')
    expect(screen.getByText(/Program B has no programme certificate/)).toBeDefined()
    expect(screen.getByText(/does not mean you hold a valid licence/)).toBeDefined()
    expect(screen.getByText('Licence active')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'CPD ledger' })).toBeDefined()
    expect(screen.getByText('Pending approval')).toBeDefined()
  })

  test('renders in Arabic, right to left, with Arabic labels and Latin IDs', async () => {
    await setAppLanguage('ar')
    renderWithApp(<CertificatesTab record={record} />)
    await screen.findByText('QTA-DEMO-A-000001')
    expect(document.documentElement.dir).toBe('rtl')
    expect(within(card('QTA-DEMO-A-000001')).getByText('سارية')).toBeDefined()
    expect(within(card('QTA-DEMO-A-000002')).getByText('تنتهي قريبًا')).toBeDefined()
    expect(within(card('QTA-DEMO-A-000003')).getByText('منتهية')).toBeDefined()
    expect(within(card('QTA-DEMO-A-000004')).getByText('ملغاة')).toBeDefined()
    expect(within(card('QTA-DEMO-A-000005')).getByText('مستبدلة')).toBeDefined()
    expect(
      within(card('QTA-DEMO-A-000002')).getByRole('button', { name: 'ابدأ التجديد' }),
    ).toBeDefined()
    expect(screen.getByRole('heading', { name: 'سجل التطوير المهني المستمر' })).toBeDefined()
    await waitFor(() => expect(screen.queryByText('Start renewal')).toBeNull())
  })
})

describe('training history', () => {
  test('a completed Program B item reads "Completed — no programme certificate"', async () => {
    renderWithApp(<HistoryTable rows={record.history} />)
    await screen.findByText('Welcoming every visitor')
    expect(screen.getByText('Completed — no programme certificate')).toBeDefined()
  })

  test('the same record reads in Arabic', async () => {
    await setAppLanguage('ar')
    renderWithApp(<HistoryTable rows={record.history} />)
    await screen.findAllByText('الترحيب بكل زائر')
    expect(screen.getByText('مكتمل — بلا شهادة برنامج')).toBeDefined()
    expect(screen.getByText('فيديو')).toBeDefined()
  })
})
