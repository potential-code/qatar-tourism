import type { RubricItem } from '../types'

/** What the trainer marks, so the learner can plan against it. */
export function MarkingCriteria({ rubric }: { rubric: RubricItem[] }) {
  return (
    <section
      aria-labelledby="criteria-heading"
      className="grid gap-3 rounded-xl border bg-card p-5 shadow-xs"
    >
      <h2 id="criteria-heading" className="font-display text-xl font-light text-ink">
        How it is marked
      </h2>
      <ul className="grid gap-2">
        {rubric.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink">{item.label}</span>
            <span className="tabular-nums text-muted-foreground">{item.max} points</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
