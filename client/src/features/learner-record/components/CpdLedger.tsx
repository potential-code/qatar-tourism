import { useTranslation } from 'react-i18next'
import { DemoSettingsNote } from '@/components/layout/DemoSettingsNote'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusPill } from '@/features/academy-mgmt/hub/components/StatusPill'
import type { CpdSummary } from '@/services/credentials/cpd'
import { useRecordFormat } from '../utils/format'

const LINE_TONE = { earned: 'good', approved: 'good', pending: 'warn', rejected: 'bad' } as const

/** Consolidated CPD ledger: earned, pending approval and required for the demo cycle. */
export function CpdLedger({ cpd }: { cpd: CpdSummary }) {
  const { t } = useTranslation('record')
  const format = useRecordFormat()
  const unit = t(`cpd.units.${cpd.unit}`)
  const percent = cpd.target > 0 ? Math.min(100, Math.round((cpd.earned / cpd.target) * 100)) : 100
  const totals: [string, number][] = [
    [t('cpd.earned'), cpd.earned],
    [t('cpd.pending'), cpd.pending],
    [t('cpd.required'), cpd.target],
  ]

  return (
    <section aria-labelledby="cpd-ledger-title" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="cpd-ledger-title" className="font-display text-2xl font-normal text-ink">
            {t('cpd.title')}
          </h2>
          <p className="max-w-[70ch] text-sm text-muted-foreground">{t('cpd.description')}</p>
        </div>
        <DemoSettingsNote />
      </div>

      <div className="grid gap-4 rounded-xl border bg-white p-5">
        <dl className="grid gap-4 sm:grid-cols-3">
          {totals.map(([label, value]) => (
            <div key={label} className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-display text-3xl text-ink tabular-nums">
                {format.number(value)}{' '}
                <span className="text-base text-muted-foreground">{unit}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-1.5">
          <Progress
            value={percent}
            aria-label={t('cpd.progressLabel', { percent })}
            className="h-2"
          />
          <p className="text-sm text-muted-foreground">
            {cpd.remaining > 0
              ? t('cpd.remaining', { value: format.number(cpd.remaining), unit })
              : t('cpd.targetMet')}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('cpd.columns.activity')}</TableHead>
              <TableHead>{t('cpd.columns.source')}</TableHead>
              <TableHead>{t('cpd.columns.date')}</TableHead>
              <TableHead>{t('cpd.columns.amount')}</TableHead>
              <TableHead>{t('cpd.columns.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cpd.lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t('cpd.empty')}
                </TableCell>
              </TableRow>
            ) : (
              cpd.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="min-w-48 font-medium">
                    {line.title}
                    {line.derived ? (
                      <span className="ms-2 text-xs font-normal text-muted-foreground">
                        {t('cpd.derived')}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{t(`cpd.source.${line.source}`)}</TableCell>
                  <TableCell className="whitespace-nowrap">{format.date(line.earnedOn)}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {t('cpd.amount', {
                      value: format.number(line.amount),
                      unit: t(`cpd.units.${line.unit}`),
                    })}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={LINE_TONE[line.status]}>
                      {t(`cpd.status.${line.status}`)}
                    </StatusPill>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
