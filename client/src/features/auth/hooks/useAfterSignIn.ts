import { ROLE_HOME, type Role } from '@shared/roles'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { useRefreshSession } from '@/hooks/useSession'
import { safeRedirect } from '@/lib/safe-redirect'
import { roleOf } from '@/lib/session'
import { ownProfileStatusQuery } from '../queries/session.queries'
import { ROLE_LABEL, type SignInMode } from '../utils/modes'

/** Paths a learner may be sent back to after sign-in (the page they were viewing). */
function learnerTarget(redirect: string | undefined): string | null {
  const target = safeRedirect(redirect, '')
  if (!target) return null
  return /^\/(learner|programmes|onboarding|sessions|trainers)(\/|$|\?)/.test(target)
    ? target
    : null
}

/**
 * Routes by the account's REAL role (brief §3: "Trainer mode → assigned trainer workspace.
 * Admin mode → admin Dashboard. A learner cannot access either by changing a URL or selector").
 * A learner with a draft profile resumes the profile wizard.
 */
export function useAfterSignIn() {
  const router = useRouter()
  const refreshSession = useRefreshSession()
  const queryClient = useQueryClient()

  return useCallback(
    async ({ mode, redirect }: { mode?: SignInMode; redirect?: string }) => {
      const session = await refreshSession()
      const role: Role | null = roleOf(session)
      if (!role) {
        router.history.push('/')
        return
      }
      if (mode && mode !== role) {
        toast.info(
          `You signed in with a ${ROLE_LABEL[role]} account, so we opened the ${ROLE_LABEL[role]} area. The sign-in mode never changes access.`,
        )
      }
      if (role !== 'learner') {
        router.history.push(ROLE_HOME[role])
        return
      }
      const back = learnerTarget(redirect)
      if (back) {
        router.history.push(back)
        return
      }
      const status = await queryClient.fetchQuery(ownProfileStatusQuery()).catch(() => null)
      router.history.push(status === 'draft' ? '/onboarding' : ROLE_HOME.learner)
    },
    [queryClient, refreshSession, router],
  )
}
