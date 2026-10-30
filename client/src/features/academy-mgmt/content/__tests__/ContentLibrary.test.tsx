import { beforeEach, describe, expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { actAs, freshDemo } from '@/services/__tests__/helpers'
import { ContentLibraryBody } from '../components/ContentLibraryPage'
import { ARTICULATE_LABEL, ARTICULATE_MISSING_TESTS } from '../utils/articulate'

beforeEach(() => {
  actAs(freshDemo(), 'user-admin')
})

function renderLibrary() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ContentLibraryBody />
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

describe('Content Library list', () => {
  test('renders both items with their four language variants, formats, versions and package ids', async () => {
    renderLibrary()
    await waitFor(() => expect(screen.getByText('Welcoming visitors to Qatar')).toBeDefined())
    expect(screen.getByText('Planning a visitor experience')).toBeDefined()

    const tables = screen.getAllByRole('table')
    expect(tables).toHaveLength(2)
    const rows = tables.flatMap((table) => within(table).getAllByRole('row').slice(1))
    expect(rows).toHaveLength(4)

    for (const packageId of [
      'wvq-en-scorm2004',
      'wvq-ar-scorm2004',
      'pve-en-xapi',
      'pve-ar-xapi',
    ]) {
      expect(screen.getByText(packageId)).toBeDefined()
    }
    expect(screen.getAllByText('SCORM 2004').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('xAPI').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('assigned-learners')).toHaveLength(4)
    expect(screen.getAllByText('1.0')).toHaveLength(4)
    // Both languages named in their own script.
    expect(screen.getAllByText('العربية').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Arabic')).toHaveLength(2)
  })

  test('each variant has a Preview and a Tracking test action', async () => {
    renderLibrary()
    await waitFor(() => expect(screen.getByText('pve-ar-xapi')).toBeDefined())
    expect(screen.getAllByRole('button', { name: /^Preview / })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: /^Tracking test for / })).toHaveLength(4)
  })

  test('the xAPI item is labelled as a simulated learning record store', async () => {
    renderLibrary()
    await waitFor(() => expect(screen.getByText('Planning a visitor experience')).toBeDefined())
    expect(screen.getAllByText('Simulated learning record store').length).toBeGreaterThan(0)
    expect(screen.getByRole('complementary', { name: 'Illustrative configuration' })).toBeDefined()
  })

  test('the Articulate row is labelled simulated and lists the missing package tests', async () => {
    renderLibrary()
    await waitFor(() => expect(screen.getAllByText(ARTICULATE_LABEL).length).toBeGreaterThan(0))
    for (const test of ARTICULATE_MISSING_TESTS) {
      expect(screen.getByText(test.title)).toBeDefined()
    }
    expect(screen.getAllByText('Not run')).toHaveLength(ARTICULATE_MISSING_TESTS.length)
  })
})

describe('Preview and tracking test', () => {
  test('Tracking test opens the real SCORM package with launch and bookmark values, and switches language with the saved-progress prompt', async () => {
    renderLibrary()
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Tracking test for Welcoming visitors to Qatar, English',
      }),
    )
    const dialog = await screen.findByRole('dialog')
    await waitFor(() =>
      expect(within(dialog).getByTitle('Preview: Welcoming visitors to Qatar')).toBeDefined(),
    )
    const frame = within(dialog).getByTitle('Preview: Welcoming visitors to Qatar')
    expect(frame.getAttribute('src')).toBe('/content/wvq-en-scorm2004/index.html')
    expect(within(dialog).getByText(/First launch \(ab-initio\)/)).toBeDefined()
    expect(within(dialog).getByText('No bookmark yet')).toBeDefined()

    fireEvent.click(within(dialog).getByRole('radio', { name: 'العربية' }))
    expect(
      await screen.findByText('Your progress has been saved. Open the Arabic version?'),
    ).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Open the Arabic version' }))
    await waitFor(() =>
      expect(within(dialog).getByTitle('Preview: الترحيب بزوار قطر').getAttribute('src')).toBe(
        '/content/wvq-ar-scorm2004/index.html',
      ),
    )
  })

  test('the xAPI tracking test shows the simulated LRS statements table with actors', async () => {
    renderLibrary()
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Tracking test for Planning a visitor experience, English',
      }),
    )
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByRole('table')).toBeDefined())
    expect(within(dialog).getAllByText('Simulated learning record store').length).toBeGreaterThan(0)
    for (const heading of ['Actor', 'Verb', 'Activity', 'Timestamp', 'Result']) {
      expect(within(dialog).getByRole('columnheader', { name: heading })).toBeDefined()
    }
    expect(within(dialog).getAllByText('LRN-0042').length).toBeGreaterThan(0)
  })
})
