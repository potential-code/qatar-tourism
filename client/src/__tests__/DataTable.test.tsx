import { describe, expect, mock, test } from 'bun:test'
import { createColumnHelper } from '@tanstack/react-table'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { DataTable, type DataTableFeatures } from '@/components/DataTable'
import i18n from '@/i18n'

type Row = { id: string; name: string }

const helper = createColumnHelper<DataTableFeatures, Row>()
const columns = helper.columns([helper.accessor('name', { header: 'Name' })])
const rows: Row[] = [
  { id: 'a', name: 'Ada' },
  { id: 'b', name: 'Grace' },
]

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  const onPaginationChange = mock(() => {})
  render(
    <I18nextProvider i18n={i18n}>
      <DataTable
        columns={columns}
        data={rows}
        rowCount={25}
        pagination={{ pageIndex: 0, pageSize: 2 }}
        onPaginationChange={onPaginationChange}
        empty="Nothing here"
        {...props}
      />
    </I18nextProvider>,
  )
  return { onPaginationChange }
}

describe('DataTable', () => {
  test('renders a header and one row per item', () => {
    renderTable()
    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Name' })).toBeDefined()
    expect(within(table).getByText('Ada')).toBeDefined()
    expect(within(table).getByText('Grace')).toBeDefined()
  })

  test('pages from the server total, not the rows it was given', () => {
    const { onPaginationChange } = renderTable()
    expect(screen.getByText('Page 1 of 13')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 2 })
  })

  test('shows the empty state when there are no rows', () => {
    renderTable({ data: [], rowCount: 0 })
    expect(screen.getByText('Nothing here')).toBeDefined()
  })
})
