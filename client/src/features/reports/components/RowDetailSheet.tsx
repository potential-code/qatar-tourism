import { Link } from '@tanstack/react-router'
import { ArrowUpRight, EyeOff } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { ReportPage, ReportRow } from '../queries/reports.queries'
import { CertificateActions } from './CertificateActions'
import { ReportCell } from './ReportCell'

/** Where a row drills down to, by report. Learner rows open the learner record. */
function drillDown(report: string, row: ReportRow) {
  if (typeof row.learnerId === 'string' && row.learnerId)
    return {
      to: '/admin/manage/users/$userId',
      params: { userId: row.learnerId },
      label: 'Open learner record',
    }
  if (report === 'trainers')
    return { to: '/admin/manage/trainers', params: {}, label: 'Open trainer management' }
  if (report === 'sessions')
    return { to: '/admin/manage/sessions', params: {}, label: 'Open session management' }
  return null
}

/** Row detail panel (brief §13): every permitted field, including detail-only ones. */
export function RowDetailSheet({
  report,
  data,
  row,
  onOpenChange,
}: {
  report: string
  data: ReportPage | undefined
  row: ReportRow | null
  onOpenChange: (open: boolean) => void
}) {
  const columns = data?.columns ?? []
  const title = row ? String(row.name ?? row.title ?? row.event ?? row.code ?? 'Record') : ''
  const subtitle = row
    ? String(row.learnerCode ?? row.code ?? row.trainerCode ?? row.eventId ?? '')
    : ''
  const target = row ? drillDown(report, row) : null

  return (
    <Sheet open={Boolean(row)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b bg-sand-deep/60 p-6">
          <p className="text-xs text-muted-foreground">{data?.title}</p>
          <SheetTitle className="font-display text-2xl font-normal text-ink">{title}</SheetTitle>
          {subtitle ? (
            <SheetDescription className="font-mono text-xs">{subtitle}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">Record details</SheetDescription>
          )}
        </SheetHeader>
        {row ? (
          <div className="grid gap-6 p-6">
            <dl className="grid gap-x-4 gap-y-3 text-sm">
              {columns.map((column) => (
                <div
                  key={column.key}
                  className="grid grid-cols-[150px_1fr] items-start gap-3 border-b border-border/50 pb-3 last:border-0"
                >
                  <dt className="text-muted-foreground">{column.header}</dt>
                  <dd className="min-w-0 break-words text-ink">
                    <ReportCell column={column} value={row[column.key]} />
                  </dd>
                </div>
              ))}
            </dl>
            {data?.hiddenColumns.length ? (
              <p className="flex items-start gap-2 rounded-lg bg-sand-deep p-3 text-xs text-muted-foreground">
                <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Hidden for your role by field permissions: {data.hiddenColumns.join(', ')}. These
                fields are never sent to the browser or included in exports.
              </p>
            ) : null}
            {report === 'certification' && typeof row.code === 'string' ? (
              <CertificateActions code={row.code} />
            ) : null}
            {target ? (
              <Link
                to={target.to as never}
                params={target.params as never}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-deep"
              >
                {target.label}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
