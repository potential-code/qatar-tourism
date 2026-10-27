import { redirect } from '@tanstack/react-router'
import type { RouterContext } from '@/lib/router-context'

/** For signed-out pages (login, register…): a signed-in visitor goes straight to the app. */
export async function redirectIfSignedIn({ context }: { context: RouterContext }) {
  const session = await context.auth.getSession()
  if (session) throw redirect({ to: '/dashboard' })
}
