import { useTranslation } from 'react-i18next'
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
import { tr } from '@/i18n/localised'
import type { HistoryResult, HistoryRow } from '@/services/credentials/history'
import { useRecordFormat } from '../utils/format'
import { HISTORY_STATUS_TONE } from '../utils/status'

/** Text for a history result, in the language on screen. */
export function useResultText() {
  const { t } = useTranslation('record')
  return (result: HistoryResult): string => {
    switch (result.kind) {
      case 'score':
        return t('history.result.score', { value: result.value })
      case 'completed':
        return t('history.result.completed')
      case 'completed_no_certificate':
        return t('history.result.completedNoCertificate')
      case 'attended':
        return t('history.result.attended')
      default:
        return t('history.result.none')
    }
  }
}

/** The chronological table. Each title opens the stored attempts, feedback and evidence. */
export function HistoryTable({
  rows,
  onOpen,
}: {
  rows: readonly HistoryRow[]
  onOpen?: (row: HistoryRow) => void
}) {
  const { t, i18n } = useTranslation('record')
  const format = useRecordFormat()
  const resultText = useResultText()
  return (
    <Table containerProps={{ tabIndex: 0, role: 'region', 'aria-label': t('tabs.history') }}>
      <TableHeader>
        <TableRow>
          <TableHead>{t('history.columns.programme')}</TableHead>
          <TableHead>{t('history.columns.item')}</TableHead>
          <TableHead>{t('history.columns.mode')}</TableHead>
          <TableHead>{t('history.columns.started')}</TableHead>
          <TableHead>{t('history.columns.completed')}</TableHead>
          <TableHead>{t('history.columns.progress')}</TableHead>
          <TableHead>{t('history.columns.result')}</TableHead>
          <TableHead>{t('history.columns.status')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap">
              {t('common.programme', { code: row.programmeCode })}
            </TableCell>
            <TableCell className="min-w-56 font-medium">
              {onOpen ? (
                <button
                  type="button"
                  onClick={() => onOpen(row)}
                  aria-label={t('history.detail.open', { title: tr(row.title, i18n.language) })}
                  className="text-start text-teal-deep underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                >
                  {tr(row.title, i18n.language)}
                </button>
              ) : (
                tr(row.title, i18n.language)
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap">{t(`history.mode.${row.mode}`)}</TableCell>
            <TableCell className="whitespace-nowrap">{format.date(row.startedAt)}</TableCell>
            <TableCell className="whitespace-nowrap">{format.date(row.completedAt)}</TableCell>
            <TableCell className="min-w-28">
              <div className="flex items-center gap-2">
                <Progress
                  value={row.progressPercent}
                  aria-label={t('history.columns.progress')}
                  className="h-1.5 w-16"
                />
                <span className="text-xs tabular-nums">{row.progressPercent}%</span>
              </div>
            </TableCell>
            <TableCell className="min-w-40">{resultText(row.result)}</TableCell>
            <TableCell>
              <StatusPill tone={HISTORY_STATUS_TONE[row.status]}>
                {t(`history.status.${row.status}`)}
              </StatusPill>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
