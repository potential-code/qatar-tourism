import { ROLE_HOME, type Role } from '@shared/roles'
import type { FacilitatorTarget } from '@shared/schemas/profile-account'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ChevronUp, FlaskConical, GraduationCap, Loader2, Shield, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { PersonAvatar } from '@/components/data/PersonAvatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRefreshSession, useSession } from '@/hooks/useSession'
import {
  type FacilitatorTargetView,
  facilitatorQuery,
  useFacilitatorSwitch,
} from '../queries/facilitator.queries'

const ICON: Record<string, typeof UserRound> = {
  learner: UserRound,
  trainer: GraduationCap,
  admin: Shield,
}

/**
 * Demo facilitator toolbar (brief §3): quick role switching for the walkthrough, shown only when
 * the server confirms the demo administrator is behind this session. Clearly marked, and kept
 * apart from public registration. The server decides; this only renders its answer.
 */
export function DemoToolbar() {
  const { session } = useSession()
  const userId = session?.user.id
  const { data } = useQuery({ ...facilitatorQuery(userId ?? ''), enabled: Boolean(userId) })
  const switchTo = useFacilitatorSwitch()
  const queryClient = useQueryClient()
  const refreshSession = useRefreshSession()
  const router = useRouter()

  if (!userId || !data?.active) return null

  async function choose(target: FacilitatorTargetView) {
    try {
      const result = await switchTo.mutateAsync(target.key as FacilitatorTarget)
      // The next user must not see the previous user's cached data.
      queryClient.clear()
      await refreshSession()
      toast.success(`Signed in as ${result.name} for the demo.`)
      router.history.push(ROLE_HOME[result.role as Role] ?? '/')
    } catch {
      toast.error('The demo account could not be opened. Try again.')
    }
  }

  const groups = [
    { label: 'Walkthrough personas', items: data.targets.filter((t) => t.role === 'learner') },
    { label: 'Trainers', items: data.targets.filter((t) => t.role === 'trainer') },
    { label: 'Academy admin', items: data.targets.filter((t) => t.role === 'admin') },
  ]

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="pointer-events-auto h-10 gap-2 rounded-full border border-maroon/25 bg-maroon-deep px-4 text-white shadow-lg hover:bg-maroon"
            aria-label={`Demo toolbar. Signed in as ${session?.user.name}. Switch demo account`}
          >
            {switchTo.isPending ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <FlaskConical aria-hidden />
            )}
            <span className="font-medium">Demo toolbar</span>
            <span className="hidden max-w-36 truncate text-white/75 sm:inline">
              {session?.user.name}
            </span>
            <ChevronUp aria-hidden className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="center"
          className="max-h-[70dvh] w-80 overflow-y-auto"
        >
          <DropdownMenuLabel className="grid gap-0.5">
            <span className="font-medium">Demo toolbar</span>
            <span className="font-normal text-muted-foreground text-xs">
              Facilitator quick switch. Signs in as a seeded demo account; not part of public
              registration.
            </span>
          </DropdownMenuLabel>
          {groups.map((group) =>
            group.items.length > 0 ? (
              <DropdownMenuGroup key={group.label}>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  {group.label}
                </DropdownMenuLabel>
                {group.items.map((target) => {
                  const Icon = ICON[target.role] ?? UserRound
                  const current = target.name === session?.user.name
                  return (
                    <DropdownMenuItem
                      key={target.key}
                      disabled={current || switchTo.isPending}
                      onSelect={() => choose(target)}
                      className="items-start gap-3 py-2"
                    >
                      {target.image ? (
                        <PersonAvatar name={target.name} src={target.image} className="size-8" />
                      ) : (
                        <Icon aria-hidden className="mt-0.5 text-teal" />
                      )}
                      <span className="grid gap-0.5">
                        <span className="font-medium">
                          {target.name}
                          {target.code ? (
                            <span className="ms-1.5 text-muted-foreground text-xs">
                              {target.code}
                            </span>
                          ) : null}
                          {current ? (
                            <span className="ms-1.5 text-teal text-xs">current</span>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground text-xs">{target.description}</span>
                      </span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
            ) : null,
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
