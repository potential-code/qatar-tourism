import type { ProgrammeCode } from '@shared/constants'
import { PROGRAMME_LABELS, PROGRAMME_TITLES } from '@shared/schemas/admin-labels'
import { useQuery } from '@tanstack/react-query'
import { Plus, Route as RouteIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Stagger, StaggerItem } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { pathsListQuery } from '../queries/paths.queries'
import type { MatchPreview as MatchPreviewData, RuleRow } from '../types'
import { CreatePathDialog } from './CreatePathDialog'
import { MatchPreview } from './MatchPreview'
import { OverrideDialog } from './OverrideDialog'
import { PathCard } from './PathCard'
import { RuleEditorSheet } from './RuleEditorSheet'
import { RulesLadder } from './RulesLadder'

const PROGRAMMES: ProgrammeCode[] = ['A', 'B', 'C']

/** Learning path management (brief §14): paths per programme, rules, preview and override. */
export function PathsOverview({
  programme,
  onProgrammeChange,
}: {
  programme: ProgrammeCode
  onProgrammeChange: (programme: ProgrammeCode) => void
}) {
  const reduce = useReducedMotion()
  const query = useQuery(pathsListQuery())
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<{ rule?: RuleRow } | null>(null)
  const [overriding, setOverriding] = useState<MatchPreviewData | null>(null)

  const paths = query.data?.paths.filter((p) => p.programme === programme) ?? []
  const rules = query.data?.rules.filter((r) => r.programme === programme) ?? []

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Learning path management"
        description="Several paths per programme, assigned by profile rules with explicit priority. Edit a draft, preview it with a learner's profile, then publish a new version."
        breadcrumbs={[
          { label: 'Academy Management', to: '/admin/manage' },
          { label: 'Learning path management' },
        ]}
        actions={
          <>
            <DemoBadge compact />
            <Button onClick={() => setCreating(true)} disabled={!query.data}>
              <Plus aria-hidden /> New path variant
            </Button>
          </>
        }
      />

      <div
        role="tablist"
        aria-label="Programme"
        className="relative inline-flex w-fit gap-1 rounded-full border bg-card p-1 shadow-xs"
      >
        {PROGRAMMES.map((code) => {
          const active = code === programme
          const count = query.data?.paths.filter((p) => p.programme === code).length
          return (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onProgrammeChange(code)}
              className={cn(
                'relative rounded-full px-5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                active ? 'text-white' : 'text-ink/70 hover:text-teal',
              )}
            >
              {active ? (
                <motion.span
                  layoutId="programme-pill"
                  transition={
                    reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }
                  }
                  className="absolute inset-0 rounded-full bg-teal"
                />
              ) : null}
              <span className="relative">
                {PROGRAMME_LABELS[code]}
                {count !== undefined ? (
                  <span
                    className={cn(
                      'ms-1.5 text-xs',
                      active ? 'text-white/75' : 'text-muted-foreground',
                    )}
                  >
                    {count} {count === 1 ? 'path' : 'paths'}
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      {query.isLoading ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-72" />
          </div>
          <Skeleton className="h-[520px]" />
        </div>
      ) : query.isError ? (
        <EmptyState
          variant="destructive"
          title="Learning paths could not be loaded"
          description={query.error.message}
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="grid gap-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl text-ink">{PROGRAMME_TITLES[programme]}</h2>
              <p className="text-sm text-muted-foreground">
                {paths.length} {paths.length === 1 ? 'path' : 'paths'}, {rules.length} assignment{' '}
                {rules.length === 1 ? 'rule' : 'rules'}
              </p>
            </div>
            {paths.length === 0 ? (
              <EmptyState
                icon={RouteIcon}
                title="No paths yet"
                description="Create a path variant to start building this programme's journey."
                action={<Button onClick={() => setCreating(true)}>New path variant</Button>}
              />
            ) : (
              <Stagger key={programme} className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {paths.map((path) => (
                  <StaggerItem key={path.id}>
                    <PathCard path={path} />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
            <RulesLadder
              rules={rules}
              onEdit={(rule) => setEditing({ rule })}
              onAdd={() => setEditing({})}
            />
          </div>

          <aside className="grid gap-4 rounded-xl border bg-card p-5 shadow-xs xl:sticky xl:top-20">
            <div className="grid gap-1">
              <h2 className="font-display text-xl text-ink">Preview the match</h2>
              <p className="text-sm text-muted-foreground">
                Which path a learner receives under the published Program {programme} rules, and
                why.
              </p>
            </div>
            <MatchPreview key={programme} programme={programme} onOverride={setOverriding} />
          </aside>
        </div>
      )}

      {query.data ? (
        <>
          <CreatePathDialog
            open={creating}
            onOpenChange={setCreating}
            programme={programme}
            paths={paths}
          />
          <RuleEditorSheet
            open={editing !== null}
            onOpenChange={(open) => !open && setEditing(null)}
            programme={programme}
            rule={editing?.rule}
            rules={rules}
            paths={paths}
          />
          <OverrideDialog
            preview={overriding}
            programme={programme}
            paths={paths}
            onOpenChange={(open) => !open && setOverriding(null)}
          />
        </>
      ) : null}
    </div>
  )
}
