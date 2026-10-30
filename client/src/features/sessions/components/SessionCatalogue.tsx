import { CalendarDays, List, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CatalogueSession } from '../types'
import { BookingDialog } from './BookingDialog'
import { SessionCalendar } from './SessionCalendar'
import { SessionCard } from './SessionCard'

type FormatFilter = 'all' | 'in_person' | 'online'
const FILTERS: FormatFilter[] = ['all', 'in_person', 'online']

/** Bookable sessions in calendar and list views (brief §6). */
export function SessionCatalogue({
  sessions,
  offerWindowHours,
}: {
  sessions: CatalogueSession[]
  offerWindowHours: number
}) {
  const { t } = useTranslation('sessions')
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
            <List aria-hidden /> {t('catalogue.list')}
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays aria-hidden /> {t('catalogue.calendar')}
          </TabsTrigger>
        </TabsList>
        <fieldset className="flex flex-wrap gap-1.5" aria-label={t('catalogue.filter')}>
          {FILTERS.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={format === value ? 'default' : 'outline'}
              aria-pressed={format === value}
              onClick={() => setFormat(value)}
            >
              {value === 'all' ? t('catalogue.allFormats') : t(`format.${value}`)}
            </Button>
          ))}
        </fieldset>
      </div>
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60">
          <EmptyState
            icon={SearchX}
            title={t('catalogue.noMatchTitle')}
            description={t('catalogue.noMatchBody')}
            action={
              <Button variant="outline" onClick={() => setFormat('all')}>
                {t('catalogue.showAllFormats')}
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
      <BookingDialog
        session={open}
        offerWindowHours={offerWindowHours}
        onOpenChange={(next) => !next && setOpenId(null)}
      />
    </Tabs>
  )
}
