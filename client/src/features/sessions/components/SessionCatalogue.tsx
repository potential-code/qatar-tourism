import { CalendarDays, List, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CatalogueSession } from '../types'
import { BookingDialog } from './BookingDialog'
import { SessionCalendar } from './SessionCalendar'
import { SessionCard } from './SessionCard'

type FormatFilter = 'all' | 'in_person' | 'online'
const FILTERS: { value: FormatFilter; label: string }[] = [
  { value: 'all', label: 'All formats' },
  { value: 'in_person', label: 'In person' },
  { value: 'online', label: 'Live online' },
]

/** Bookable sessions in calendar and list views (brief §6). */
export function SessionCatalogue({ sessions }: { sessions: CatalogueSession[] }) {
  const [format, setFormat] = useState<FormatFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const visible = useMemo(
    () => sessions.filter((s) => format === 'all' || s.format === format),
    [sessions, format],
  )
  // Re-read the open session from fresh data so its state updates after booking.
  const open = sessions.find((s) => s.id === openId) ?? null

  return (
    <Tabs defaultValue="list" className="gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="list">
            <List aria-hidden /> List
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays aria-hidden /> Calendar
          </TabsTrigger>
        </TabsList>
        <fieldset className="flex flex-wrap gap-1.5" aria-label="Filter by format">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={format === f.value ? 'default' : 'outline'}
              aria-pressed={format === f.value}
              onClick={() => setFormat(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </fieldset>
      </div>
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60">
          <EmptyState
            icon={SearchX}
            title="No sessions match this filter"
            description="Try another format to see more sessions."
            action={
              <Button variant="outline" onClick={() => setFormat('all')}>
                Show all formats
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <TabsContent value="list">
            <div className="flex flex-col gap-3">
              {visible.map((s) => (
                <Reveal key={s.id}>
                  <SessionCard session={s} onOpen={() => setOpenId(s.id)} />
                </Reveal>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="calendar">
            <SessionCalendar sessions={visible} onOpen={(s) => setOpenId(s.id)} />
          </TabsContent>
        </>
      )}
      <BookingDialog session={open} onOpenChange={(next) => !next && setOpenId(null)} />
    </Tabs>
  )
}
