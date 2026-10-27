import { useQuery } from '@tanstack/react-query'
import {
  CalendarClock,
  CalendarRange,
  ClipboardList,
  Languages,
  Plus,
  UserPlus,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import { cardHover } from '@/components/motion/variants'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ManagePage } from '../../hub/components/ManagePage'
import { CardsSkeleton, ErrorPanel } from '../../hub/components/QueryStates'
import { initials } from '../../hub/utils/format'
import { trainersQuery } from '../queries/trainers.queries'
import { TrainerFormDialog } from './TrainerFormDialog'
import { TrainerSheet } from './TrainerSheet'

export function TrainersPage() {
  const query = useQuery(trainersQuery())
  const reduce = useReducedMotion()
  const [selected, setSelected] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <ManagePage
      title="Trainer management"
      description="Ten fictional trainers. Open a profile to edit it, approve programmes and review role-based rights."
      actions={
        <Button onClick={() => setAdding(true)}>
          <UserPlus /> Provision trainer
        </Button>
      }
    >
      <p className="-mt-4 text-sm text-muted-foreground">
        Trainer accounts are provisioned by administrators. Public self-registration can never
        create a trainer.
      </p>
      {query.isPending ? (
        <CardsSkeleton count={9} className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3" />
      ) : query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <Stagger className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {query.data.items.map((t) => (
            <StaggerItem key={t.id}>
              <motion.button
                type="button"
                onClick={() => setSelected(t.id)}
                initial="rest"
                whileHover={reduce ? undefined : 'hover'}
                whileTap={reduce ? undefined : 'press'}
                variants={cardHover}
                className="group flex h-full w-full flex-col gap-4 rounded-xl border bg-card p-6 text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="size-14 ring-4 ring-teal-mist">
                    <AvatarFallback className="bg-teal-deep font-display text-lg text-white">
                      {initials(t.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 gap-0.5">
                    <p className="text-xs font-medium tracking-wide text-teal tabular-nums">
                      {t.code}
                    </p>
                    <p className="font-display text-xl leading-tight text-ink">{t.fullName}</p>
                    <p className="text-sm text-muted-foreground">{t.headline}</p>
                  </div>
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-ink/80">{t.bio}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Languages className="size-3.5" aria-hidden /> {t.languages.join(' and ')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {t.programmes.map((p) => (
                    <Badge key={p} className="bg-teal-mist text-teal-deep">
                      Program {p}
                    </Badge>
                  ))}
                  {t.programmes.length === 0 ? (
                    <Badge variant="outline">No programmes approved</Badge>
                  ) : null}
                </div>
                <dl className="mt-auto grid grid-cols-3 gap-2 border-t pt-4 text-xs text-muted-foreground">
                  <div className="grid gap-1">
                    <dt className="flex items-center gap-1">
                      <CalendarClock className="size-3.5" aria-hidden /> Upcoming
                    </dt>
                    <dd className="font-display text-lg text-ink tabular-nums">{t.upcoming}</dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="flex items-center gap-1">
                      <ClipboardList className="size-3.5" aria-hidden /> To mark
                    </dt>
                    <dd className="font-display text-lg text-ink tabular-nums">
                      {t.pendingMarking}
                    </dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="flex items-center gap-1">
                      <CalendarRange className="size-3.5" aria-hidden /> Sessions
                    </dt>
                    <dd className="font-display text-lg text-ink tabular-nums">{t.sessions}</dd>
                  </div>
                </dl>
              </motion.button>
            </StaggerItem>
          ))}
          <StaggerItem>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-teal/25 bg-teal-mist/30 p-6 text-center transition-colors hover:border-teal/50 hover:bg-teal-mist/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="grid size-12 place-items-center rounded-full bg-white text-teal shadow-xs">
                <Plus className="size-5" aria-hidden />
              </span>
              <span className="font-display text-xl text-ink">Provision a trainer</span>
              <span className="max-w-64 text-sm text-muted-foreground">
                Create an administrator-approved trainer account with approved programmes.
              </span>
            </button>
          </StaggerItem>
        </Stagger>
      )}
      <TrainerSheet trainerId={selected} onClose={() => setSelected(null)} />
      <TrainerFormDialog open={adding} onOpenChange={setAdding} />
    </ManagePage>
  )
}
