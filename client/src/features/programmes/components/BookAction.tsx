import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'

/**
 * Sign-in-to-book (brief §2). Booking itself lives in the learner portal (My sessions), which
 * checks eligibility and capacity; a visitor is sent to sign in first and returned there.
 */
export function BookAction({ full }: { full: boolean }) {
  const { role } = useSession()
  const { t } = useTranslation('public')
  if (role === 'learner') {
    return (
      <Button asChild size="sm" variant="outline">
        <Link to={'/learner/sessions' as never}>
          {full ? t('sessions.joinWaitlist') : t('sessions.book')}
        </Link>
      </Button>
    )
  }
  if (role) return null
  return (
    <Button asChild size="sm">
      <Link to="/login" search={{ redirect: '/learner/sessions' }}>
        {t('sessions.signInToBook')}
      </Link>
    </Button>
  )
}
