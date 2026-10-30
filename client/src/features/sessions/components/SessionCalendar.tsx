import { CalendarX2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { labelDayButton } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { Calendar } from '@/components/ui/calendar'
import { EmptyState } from '@/components/ui/empty-state'
import { qatarDateKey } from '@/lib/format/qatar-time'
import { useSessionFormat } from '../hooks/useSessionFormat'
import type { CatalogueSession } from '../types'
import { SessionCard } from './SessionCard'

const fromKey = (key: string) => {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Month view: days with sessions are marked; picking a day lists its sessions (Qatar dates). */
export function SessionCalendar({
  sessions,
  onOpen,
}: {
  sessions: CatalogueSession[]
  onOpen: (session: CatalogueSession) => void
}) {
  const { t } = useTranslation('sessions')
  const format = useSessionFormat()
  const byDay = useMemo(() => {
    const map = new Map<string, CatalogueSession[]>()
    for (const s of sessions) {
      const key = qatarDateKey(s.startsAt)
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return map
  }, [sessions])
  const firstKey = [...byDay.keys()].sort()[0]
  const [selected, setSelected] = useState<Date | undefined>(
    firstKey ? fromKey(firstKey) : undefined,
  )
  const [month, setMonth] = useState<Date>(firstKey ? fromKey(firstKey) : new Date())
  const selectedKey = selected ? toKey(selected) : undefined
  const daySessions = selectedKey ? (byDay.get(selectedKey) ?? []) : []

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <div className="rounded-xl border bg-card p-3 shadow-xs">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          month={month}
          onMonthChange={setMonth}
          modifiers={{ hasSession: [...byDay.keys()].map(fromKey) }}
          modifiersClassNames={{
            hasSession:
              'relative font-semibold text-teal-deep after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-maroon',
          }}
          // Screen readers hear which days have sessions, not only the visual dot.
          labels={{
            labelDayButton: (date, modifiers, options, dateLib) =>
              `${labelDayButton(date, modifiers, options, dateLib)}${modifiers.hasSession ? t('calendar.hasSessions') : ''}`,
          }}
          className="mx-auto"
        />
        <p className="px-2 pb-1 text-xs text-muted-foreground">{t('calendar.marked')}</p>
      </div>
      <div className="flex flex-col gap-3" aria-live="polite">
        <h3 className="font-display text-xl font-normal text-ink">
          {selectedKey && daySessions[0]
            ? format.dateLong(daySessions[0].startsAt)
            : t('calendar.chooseDay')}
        </h3>
        {daySessions.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/60">
            <EmptyState
              icon={CalendarX2}
              title={t('calendar.emptyTitle')}
              description={t('calendar.emptyBody')}
            />
          </div>
        ) : (
          daySessions.map((s) => <SessionCard key={s.id} session={s} onOpen={() => onOpen(s)} />)
        )}
      </div>
    </div>
  )
}
