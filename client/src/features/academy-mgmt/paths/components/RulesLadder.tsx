import type { RuleGroup } from '@shared/content/paths'
import { Lock, Pencil, Plus } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { easeOut } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { RuleRow } from '../types'
import { describeGroup } from '../utils/rules'

const STATUS_STYLE: Record<string, string> = {
  published: 'border-teal/30 text-teal-deep',
  draft: 'border-maroon/30 bg-maroon-mist text-maroon-deep',
  archived: 'text-muted-foreground',
}

/**
 * Assignment rules in resolution order (brief §14 "Resolve multiple matches by explicit
 * priority"): highest priority first, the programme default last.
 */
export function RulesLadder({
  rules,
  onEdit,
  onAdd,
}: {
  rules: RuleRow[]
  onEdit: (rule: RuleRow) => void
  onAdd: () => void
}) {
  const reduce = useReducedMotion()
  const ordered = [...rules].sort(
    (a, b) => Number(a.isDefault) - Number(b.isDefault) || b.priority - a.priority,
  )
  return (
    <section aria-labelledby="rules-title" className="rounded-xl border bg-card">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b px-5 py-4">
        <div className="grid gap-1">
          <h2 id="rules-title" className="font-display text-xl text-ink">
            Assignment rules
          </h2>
          <p className="text-sm text-muted-foreground">
            Evaluated from the highest priority down. The first match wins; the default applies when
            nothing else matches or the profile is incomplete.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus aria-hidden /> Add rule
        </Button>
      </header>
      <ol className="grid">
        {ordered.map((rule, index) => (
          <motion.li
            key={rule.id}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.04, ease: easeOut }}
            className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-start gap-4 border-b px-5 py-4 last:border-b-0"
          >
            <div className="grid justify-items-center gap-0.5 rounded-lg bg-sand-deep/60 py-2">
              <span className="font-display text-2xl leading-none tabular-nums text-ink">
                {rule.isDefault ? '0' : rule.priority}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {rule.isDefault ? 'fallback' : 'priority'}
              </span>
            </div>
            <div className="grid min-w-0 gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-ink">{rule.name}</p>
                {rule.isDefault ? (
                  <Badge className="gap-1 border-teal/20 bg-teal-mist text-teal-deep">
                    <Lock aria-hidden className="size-3" /> Default
                  </Badge>
                ) : null}
                <Badge variant="outline" className={STATUS_STYLE[rule.status]}>
                  {rule.status[0]?.toUpperCase()}
                  {rule.status.slice(1)}
                </Badge>
              </div>
              <p className="text-sm text-ink/80">{rule.summary}</p>
              {rule.isDefault ? null : (
                <p className="text-xs text-muted-foreground">
                  Evaluates: {describeGroup(rule.conditions as RuleGroup)}
                </p>
              )}
              <p className="text-xs">
                <span className="text-muted-foreground">Assigns </span>
                <span className="font-medium text-teal-deep">{rule.pathName}</span>
              </p>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onEdit(rule)}
              aria-label={`Edit rule ${rule.name}`}
            >
              <Pencil aria-hidden />
            </Button>
          </motion.li>
        ))}
      </ol>
      <p className="border-t bg-sand/60 px-5 py-3 text-xs text-muted-foreground">
        AI path recommendations can only choose from these approved options. They cannot rewrite
        these mandatory rules.
      </p>
    </section>
  )
}
