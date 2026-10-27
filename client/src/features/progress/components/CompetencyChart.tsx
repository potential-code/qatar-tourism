import { motion, useReducedMotion } from 'motion/react'
import { easeOut } from '@/components/motion/variants'
import { cn } from '@/lib/utils'

export type CompetencyDatum = {
  key: string
  label: string
  baseline: number | null
  post: number | null
  foundation?: number | null
}

type Series = {
  key: 'baseline' | 'foundation' | 'post'
  label: string
  bar: string
  swatch: string
}

const barClass = 'absolute inset-y-0 start-0 w-full origin-left rounded-full rtl:origin-right'

const SERIES: Series[] = [
  { key: 'baseline', label: 'Baseline', bar: 'bg-teal-soft', swatch: 'bg-teal-soft' },
  { key: 'foundation', label: 'Foundation quiz', bar: 'bg-maroon/70', swatch: 'bg-maroon/70' },
  { key: 'post', label: 'Post', bar: 'bg-teal', swatch: 'bg-teal' },
]

/**
 * Competency comparison (brief §5 dashboard, §8). Each item is 0 or 20 points, so a bar is
 * either empty or full; the number is printed next to it, and a table summary is provided for
 * assistive technology (status never by colour alone).
 */
export function CompetencyChart({
  data,
  postLabel = 'Post',
  showFoundation = false,
  className,
}: {
  data: readonly CompetencyDatum[]
  postLabel?: string
  showFoundation?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  const series = SERIES.filter((s) => s.key !== 'foundation' || showFoundation).map((s) =>
    s.key === 'post' ? { ...s, label: postLabel } : s,
  )
  const hasPost = data.some((d) => d.post !== null)

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-hidden>
        {series.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-2">
            <span className={cn('size-2.5 rounded-sm', s.swatch)} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-4" aria-hidden>
        {data.map((row, rowIndex) => (
          <div
            key={row.key}
            className="grid gap-1.5 sm:grid-cols-[11rem_1fr] sm:items-center sm:gap-4"
          >
            <p className="text-sm font-medium text-ink">{row.label}</p>
            <div className="flex flex-col gap-1">
              {series.map((s) => {
                const value = row[s.key] ?? null
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-sand-deep">
                      {value !== null && value > 0 ? (
                        reduce ? (
                          <span
                            className={cn(barClass, s.bar)}
                            style={{ transform: `scaleX(${value / 20})` }}
                          />
                        ) : (
                          <motion.span
                            className={cn(barClass, s.bar)}
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: value / 20 }}
                            viewport={{ once: true, amount: 0.6 }}
                            transition={{ duration: 0.7, ease: easeOut, delay: rowIndex * 0.06 }}
                          />
                        )
                      ) : null}
                    </div>
                    <span className="w-16 text-end text-xs tabular-nums text-muted-foreground">
                      {value === null ? 'Not yet' : value > 0 ? `${value} / 20` : '0 / 20'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>
          Points per competency, out of 20
          {hasPost ? `, baseline compared with ${postLabel.toLowerCase()}` : ''}
        </caption>
        <thead>
          <tr>
            <th scope="col">Competency</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {series.map((s) => (
                <td key={s.key}>{row[s.key] ?? 'Not yet taken'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
