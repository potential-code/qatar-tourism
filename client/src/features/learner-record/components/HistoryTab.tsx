import { History } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OptionSelect } from '@/features/academy-mgmt/hub/components/OptionSelect'
import type { HistoryRow } from '@/services/credentials/history'
import { HISTORY_MODES, HISTORY_STATUSES } from '../utils/status'
import { HistoryDetailSheet } from './HistoryDetailSheet'
import { HistoryTable } from './HistoryTable'

interface Filters {
  programme: string | null
  status: string | null
  mode: string | null
  from: string
  to: string
}

const NO_FILTERS: Filters = { programme: null, status: null, mode: null, from: '', to: '' }

/** Training History: every programme in one chronological list with filters (SPEC §4). */
export function HistoryTab({ rows }: { rows: readonly HistoryRow[] }) {
  const { t } = useTranslation('record')
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [open, setOpen] = useState<HistoryRow | null>(null)

  const programmes = useMemo(() => [...new Set(rows.map((r) => r.programmeCode))].sort(), [rows])
  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!filters.programme || r.programmeCode === filters.programme) &&
          (!filters.status || r.status === filters.status) &&
          (!filters.mode || r.mode === filters.mode) &&
          (!filters.from || r.sortAt.slice(0, 10) >= filters.from) &&
          (!filters.to || r.sortAt.slice(0, 10) <= filters.to),
      ),
    [rows, filters],
  )
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)
  const set = (patch: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...patch }))
  const all = t('history.filters.all')

  return (
    <div className="grid gap-4">
      <form
        aria-label={t('history.filters.label')}
        className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="hist-programme">{t('history.filters.programme')}</Label>
          <OptionSelect
            id="hist-programme"
            value={filters.programme}
            onChange={(programme) => set({ programme })}
            allowNone
            noneLabel={all}
            placeholder={all}
            options={programmes.map((code) => ({
              value: code,
              label: t('common.programme', { code }),
            }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="hist-mode">{t('history.filters.format')}</Label>
          <OptionSelect
            id="hist-mode"
            value={filters.mode}
            onChange={(mode) => set({ mode })}
            allowNone
            noneLabel={all}
            placeholder={all}
            options={HISTORY_MODES.map((m) => ({ value: m, label: t(`history.mode.${m}`) }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="hist-status">{t('history.filters.status')}</Label>
          <OptionSelect
            id="hist-status"
            value={filters.status}
            onChange={(status) => set({ status })}
            allowNone
            noneLabel={all}
            placeholder={all}
            options={HISTORY_STATUSES.map((s) => ({ value: s, label: t(`history.status.${s}`) }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="hist-from">{t('history.filters.from')}</Label>
          <Input
            id="hist-from"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => set({ from: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="hist-to">{t('history.filters.to')}</Label>
          <Input
            id="hist-to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => set({ to: e.target.value })}
          />
        </div>
      </form>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p role="status">{t('history.count', { shown: visible.length, total: rows.length })}</p>
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={() => setFilters(NO_FILTERS)}>
            {t('history.filters.clear')}
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        {visible.length === 0 ? (
          <EmptyState
            icon={History}
            title={filtered ? t('history.emptyFilteredTitle') : t('history.emptyTitle')}
            description={filtered ? t('history.emptyFilteredBody') : t('history.emptyBody')}
          />
        ) : (
          <HistoryTable rows={visible} onOpen={setOpen} />
        )}
      </div>
      <HistoryDetailSheet row={open} onClose={() => setOpen(null)} />
    </div>
  )
}
