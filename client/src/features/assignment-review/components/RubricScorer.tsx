import { useId } from 'react'
import { Input } from '@/components/ui/input'
import type { RubricItem } from '@/features/assignments/types'

interface RubricScorerProps {
  rubric: RubricItem[]
  breakdown: Record<string, number>
  onChange: (key: string, value: number) => void
}

/** One slider plus number field per rubric part; both are keyboard operable. */
export function RubricScorer({ rubric, breakdown, onChange }: RubricScorerProps) {
  const id = useId()
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-1 text-sm font-medium text-ink">Rubric</legend>
      {rubric.map((item) => {
        const value = breakdown[item.key] ?? 0
        const clamp = (n: number) =>
          Math.max(0, Math.min(item.max, Number.isFinite(n) ? Math.round(n) : 0))
        return (
          <div key={item.key} className="grid gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`${id}-${item.key}`} className="text-sm text-ink">
                {item.label}
              </label>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Input
                  aria-label={`${item.label} score`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={item.max}
                  value={value}
                  onChange={(event) => onChange(item.key, clamp(Number(event.target.value)))}
                  className="h-8 w-16 bg-white text-end tabular-nums"
                />
                /{item.max}
              </span>
            </div>
            <input
              id={`${id}-${item.key}`}
              type="range"
              min={0}
              max={item.max}
              step={1}
              value={value}
              onChange={(event) => onChange(item.key, clamp(Number(event.target.value)))}
              className="h-2 w-full cursor-pointer accent-teal"
            />
          </div>
        )
      })}
    </fieldset>
  )
}
