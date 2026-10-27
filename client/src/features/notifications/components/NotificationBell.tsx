import { useQuery } from '@tanstack/react-query'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { spring } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { qatarDateTime } from '@/features/sessions/utils/qatar-time'
import { cn } from '@/lib/utils'
import { myNotificationsQuery, useMarkRead } from '../queries/notifications.queries'

/**
 * In-app notification bell for learners and trainers. Mount it in PortalShell's `notifications`
 * slot: `<PortalShell portal="learner" notifications={<NotificationBell />} />`.
 */
export function NotificationBell() {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const query = useQuery(myNotificationsQuery())
  const markRead = useMarkRead()
  const unread = query.data?.unread ?? 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Bell aria-hidden />
          <AnimatePresence>
            {unread > 0 ? (
              <motion.span
                key={unread}
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={spring}
                className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-maroon px-1 text-[11px] font-medium text-white"
                aria-hidden
              >
                {unread > 9 ? '9+' : unread}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Notifications"
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="font-display text-lg text-ink">Notifications</p>
          {unread > 0 ? (
            <Button size="xs" variant="ghost" onClick={() => markRead.mutate(undefined)}>
              <CheckCheck aria-hidden /> Mark all read
            </Button>
          ) : null}
        </div>
        {query.isPending ? (
          <div className="grid gap-2 p-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : query.isError ? (
          <p className="p-4 text-sm text-destructive">
            Notifications could not be loaded.{' '}
            <button type="button" className="underline" onClick={() => query.refetch()}>
              Try again
            </button>
          </p>
        ) : query.data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <BellOff aria-hidden className="size-6" /> You have no notifications yet.
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y">
              {query.data.items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => !n.readAt && markRead.mutate([n.id])}
                    className={cn(
                      'grid w-full gap-1 px-4 py-3 text-start text-sm transition-colors hover:bg-sand',
                      !n.readAt && 'bg-teal-mist/40',
                    )}
                  >
                    <span className="flex items-start gap-2 font-medium text-ink">
                      {!n.readAt ? (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-maroon">
                          <span className="sr-only">Unread: </span>
                        </span>
                      ) : null}
                      {n.subject}
                    </span>
                    <span className="line-clamp-3 text-ink-soft">{n.body}</span>
                    <span className="text-xs text-muted-foreground">
                      {qatarDateTime(n.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          A matching demo email is generated for each message. No external emails are sent.
        </p>
      </PopoverContent>
    </Popover>
  )
}
