import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ProgrammeBNotice } from './ProgrammeBNotice'

/**
 * My sessions while Program B is active (brief §5): B has no required sessions, so the page
 * explains that and links on. A learner who holds Program A goes to its sessions; anyone else
 * goes to the public programmes. No booking catalogue or bookings list is shown for B.
 */
export function ProgrammeBSessions({ holdsA }: { holdsA: boolean }) {
  const { t } = useTranslation('sessions')
  return (
    <div className="flex flex-col gap-6">
      <ProgrammeBNotice
        onlyB={!holdsA}
        standalone
        action={
          <Button asChild variant={holdsA ? 'default' : 'outline'}>
            {holdsA ? (
              <Link to="/learner/sessions" search={{ programme: 'A' }}>
                {t('bNotice.openA')} <ArrowRight aria-hidden className="rtl:-scale-x-100" />
              </Link>
            ) : (
              <Link to="/programmes">
                {t('bNotice.explore')} <ArrowRight aria-hidden className="rtl:-scale-x-100" />
              </Link>
            )}
          </Button>
        }
      />
    </div>
  )
}
