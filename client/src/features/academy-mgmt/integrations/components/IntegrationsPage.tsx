import { useQuery } from '@tanstack/react-query'
import { Building2, CheckCircle2, KeyRound, type LucideIcon, Mail, MonitorPlay } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { cn } from '@/lib/utils'
import { ManagePage } from '../../hub/components/ManagePage'
import { CardsSkeleton, ErrorPanel } from '../../hub/components/QueryStates'
import { StatusPill } from '../../hub/components/StatusPill'
import { integrationsQuery } from '../../hub/queries/governance.queries'
import { qDateTime } from '../../hub/utils/format'

const ICON: Record<string, LucideIcon> = {
  crm: Building2,
  sso: KeyRound,
  email: Mail,
  classroom: MonitorPlay,
}
const STATES = ['Demo', 'Not connected', 'Connected'] as const

/** Proposed adapters with their state backed by evidence (brief §14 Integration settings). */
export function IntegrationsPage() {
  const query = useQuery(integrationsQuery())
  const reduce = useReducedMotion()
  return (
    <ManagePage
      title="Integration settings"
      description="The proposed CRM, single sign-on, email and online-classroom adapters. Each state is backed by evidence from this environment."
    >
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-5 py-3 text-sm shadow-xs">
        <span className="font-medium text-ink">States</span>
        <StatusPill tone="info">Demo: a simulated adapter, labelled wherever it appears</StatusPill>
        <StatusPill tone="muted">Not connected: nothing configured</StatusPill>
        <StatusPill tone="good">Connected: confirmed by the provider</StatusPill>
      </div>
      {query.isPending ? (
        <CardsSkeleton count={4} className="grid gap-5 lg:grid-cols-2" />
      ) : query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            {query.data.items.map((item, i) => {
              const Icon = ICON[item.key] ?? Building2
              return (
                <motion.article
                  key={item.key}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.45 }}
                  className="grid content-start gap-5 rounded-xl border bg-card p-6 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-teal-mist text-teal">
                        <Icon className="size-6" aria-hidden />
                      </span>
                      <div className="grid gap-1">
                        <h2 className="font-display text-xl font-normal text-ink">{item.name}</h2>
                        <p className="text-sm text-muted-foreground">{item.purpose}</p>
                      </div>
                    </div>
                    {item.state === 'Demo' ? <SimulatedTag label="Demo" /> : null}
                  </div>
                  <p className="sr-only">State: {item.state}</p>
                  <div
                    aria-hidden="true"
                    className="grid grid-cols-3 gap-1 rounded-full bg-sand p-1 text-center text-xs"
                  >
                    {STATES.map((s) => (
                      <span
                        key={s}
                        className={cn(
                          'rounded-full px-2 py-1.5 transition-colors',
                          s === item.state
                            ? 'bg-white font-medium text-teal-deep shadow-sm'
                            : 'text-muted-foreground',
                        )}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="grid gap-2">
                    <p className="text-xs font-medium text-ink">Evidence</p>
                    <ul className="grid gap-1.5">
                      {item.evidence.map((e) => (
                        <li key={e} className="flex items-start gap-2 text-sm text-ink/80">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="rounded-lg bg-sand/70 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-ink">Intended behaviour. </span>
                    {item.intended}
                  </p>
                </motion.article>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Evidence checked {qDateTime(query.data.checkedAt)} Qatar time. Connecting any adapter
            requires Qatar Tourism IT and cybersecurity approval; nothing is connected in this
            trial.
          </p>
        </>
      )}
    </ManagePage>
  )
}
