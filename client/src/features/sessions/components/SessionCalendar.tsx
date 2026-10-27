import { CalendarX2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { EmptyState } from '@/components/ui/empty-state'
import { qatarDateKey, qatarDateLong } from '@/lib/format/qatar-time'
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
          className="mx-auto"
        />
        <p className="px-2 pb-1 text-xs text-muted-foreground">
          Marked days have sessions. Dates follow Qatar time.
        </p>
      </div>
      <div className="flex flex-col gap-3" aria-live="polite">
        <h3 className="font-display text-xl font-normal text-ink">
          {selectedKey && daySessions[0] ? qatarDateLong(daySessions[0].startsAt) : 'Choose a day'}
        </h3>
        {daySessions.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/60">
            <EmptyState
              icon={CalendarX2}
              title="No sessions on this day"
              description="Pick a marked day in the calendar, or switch to the list to see every session."
            />
          </div>
        ) : (
          daySessions.map((s) => <SessionCard key={s.id} session={s} onOpen={() => onOpen(s)} />)
        )}
      </div>
    </div>
  )
}
