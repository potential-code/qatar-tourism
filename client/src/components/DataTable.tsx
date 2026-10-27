import {
  type ColumnDef,
  functionalUpdate,
  type PaginationState,
  type RowData,
  rowPaginationFeature,
  tableFeatures,
  type Updater,
  useTable,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Generic, server-paginated table (TanStack Table v9).
 *
 * Features are registered explicitly in v9; build columns for this table with
 * `createColumnHelper<DataTableFeatures, Row>()`. The server owns pagination: pass the
 * current page's rows, the total row count, and the page state (usually from the URL).
 */
export const dataTableFeatures = tableFeatures({ rowPaginationFeature })
export type DataTableFeatures = typeof dataTableFeatures

type DataTableProps<TData extends RowData> = {
  // biome-ignore lint/suspicious/noExplicitAny: each column has its own value type
  columns: ColumnDef<DataTableFeatures, TData, any>[]
  data: TData[]
  rowCount: number
  pagination: PaginationState
  onPaginationChange: (next: PaginationState) => void
  getRowId?: (row: TData) => string
  isLoading?: boolean
  empty?: ReactNode
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  rowCount,
  pagination,
  onPaginationChange,
  getRowId,
  isLoading = false,
  empty,
}: DataTableProps<TData>) {
  const { t } = useTranslation()

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    rowCount,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    manualPagination: true,
    state: { pagination },
    onPaginationChange: (updater: Updater<PaginationState>) =>
      onPaginationChange(functionalUpdate(updater, pagination)),
  })

  const pageCount = Math.max(table.getPageCount(), 1)
  const rows = table.getRowModel().rows
  const columnCount = table.getAllLeafColumns().length

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id} className="text-start">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
                <TableRow key={index}>
                  <TableCell colSpan={columnCount}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-32 text-center">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">{t('common.totalItems', { count: rowCount })}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="rtl:rotate-180" aria-hidden />
            {t('common.previous')}
          </Button>
          <span aria-live="polite">
            {t('common.pageOf', { page: pagination.pageIndex + 1, pageCount })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t('common.next')}
            <ChevronRight className="rtl:rotate-180" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
