import type { ProgrammeCode } from '@shared/constants'
import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import type { Overview } from '../../queries/analytics.queries'
import { count, percent } from '../../utils/format'
import { PanelCard } from '../PanelCard'

const NOTES: Record<ProgrammeCode, string> = {
  A: 'Two levels, a trainer-led session, a practical assignment and certification.',
  B: 'One stage. No certificate: completion ends at the post-assessment and short response.',
  C: 'Illustrative sample programme with seeded historical activity.',
}

/** Brief §12 progress funnel with programme-specific steps (A certification is never imposed on B). */
export function FunnelPanel({
  data,
  onOpen,
}: {
  data: Overview
  onOpen: (programme: ProgrammeCode) => void
}) {
  const reduce = useReducedMotion()
  const available = data.funnels.map((f) => f.programme)
  const [selected, setSelected] = useState<ProgrammeCode>(available[0] ?? 'A')
  const active = data.funnels.find((f) => f.programme === selected) ?? data.funnels[0]
  const base = active?.steps[0]?.value ?? 0

  return (
    <PanelCard
      title="Progress funnel"
      description={active ? NOTES[active.programme] : 'No enrolments in this cohort.'}
      className="col-span-7"
      action={
        <SegmentedControl
          aria-label="Funnel programme"
          value={active?.programme ?? selected}
          onValueChange={(v) => setSelected(v as ProgrammeCode)}
          className="rounded-full"
        >
          {available.map((code) => (
            <SegmentedControlItem key={code} value={code} className="rounded-full px-3 text-xs">
              {PROGRAMME_LABELS[code]}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      }
    >
      <ol className="grid gap-3" aria-label={`${PROGRAMME_LABELS[selected]} funnel`}>
        {active?.steps.map((step, index) => {
          const width = base ? (step.value / base) * 100 : 0
          const prev = active.steps[index - 1]
          const drop = prev && prev.value > 0 ? 100 - (step.value / prev.value) * 100 : null
          return (
            <li
              key={`${active.programme}-${step.key}`}
              className="grid grid-cols-[180px_1fr_96px] items-center gap-4"
            >
              <span className="text-sm text-ink">{step.label}</span>
              <div className="relative h-9 overflow-hidden rounded-lg bg-teal-mist/60">
                <motion.div
                  key={`${active.programme}-${step.key}-bar`}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  style={{ width: `${Math.max(width, 1.5)}%`, originX: 0 }}
                  className={
                    index === active.steps.length - 1
                      ? 'h-full rounded-lg bg-maroon'
                      : 'h-full rounded-lg bg-teal'
                  }
                />
                <span className="absolute inset-y-0 start-3 flex items-center text-xs font-medium text-white mix-blend-normal">
                  {width > 14 ? percent(step.share) : null}
                </span>
              </div>
              <div className="text-end">
                <p className="font-display text-lg leading-none tabular-nums text-ink">
                  {count(step.value)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {drop === null
                    ? 'enrolled'
                    : drop > 0
                      ? `${percent(Math.round(drop * 10) / 10)} drop`
                      : 'no drop'}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
      <button
        type="button"
        onClick={() => onOpen(selected)}
        className="mt-5 self-start text-sm font-medium text-teal underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Open {PROGRAMME_LABELS[selected]} users report
      </button>
    </PanelCard>
  )
}
