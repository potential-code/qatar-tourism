import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'

/**
 * Sign-in-to-book (brief §2). Booking itself lives in the learner portal (My sessions), which
 * checks eligibility and capacity; a visitor is sent to sign in first and returned there.
 */
export function BookAction({ full }: { full: boolean }) {
  const { role } = useSession()
  if (role === 'learner') {
    return (
      <Button asChild size="sm" variant="outline">
        <Link to={'/learner/sessions' as never}>
          {full ? 'Join the waitlist' : 'Book in My sessions'}
        </Link>
      </Button>
    )
  }
  if (role) return null
  return (
    <Button asChild size="sm">
      <Link to="/login" search={{ redirect: '/learner/sessions' }}>
        Sign in to book
      </Link>
    </Button>
  )
}
