import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/** C06 is trainer-led: booking lives on My sessions (another portal page). */
export function SessionUnit({ programme }: { programme: ProgrammeCode }) {
  const { t } = useTranslation('learner')
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border bg-white p-6 shadow-sm">
      <CalendarDays aria-hidden className="size-8 text-teal" />
      <h2 className="font-display text-2xl font-normal text-ink">{t('learning.session.title')}</h2>
      <p className="max-w-[60ch] text-muted-foreground">{t('learning.session.body')}</p>
      <Button asChild>
        <Link to={'/learner/sessions' as never} search={{ programme } as never}>
          {t('learning.session.goTo')}
        </Link>
      </Button>
    </div>
  )
}
