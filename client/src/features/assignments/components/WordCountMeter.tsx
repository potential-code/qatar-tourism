import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** Live word count against the task's range, in words as well as a bar. */
export function WordCountMeter({ words, min, max }: { words: number; min: number; max: number }) {
  const { t } = useTranslation('learner')
  const within = words >= min && words <= max
  const need = min - words
  const over = words - max
  const message =
    words === 0
      ? t('assignments.wordCount.range', { min, max })
      : words < min
        ? t(need === 1 ? 'assignments.wordCount.neededOne' : 'assignments.wordCount.neededMany', {
            n: need,
          })
        : words > max
          ? t(over === 1 ? 'assignments.wordCount.overOne' : 'assignments.wordCount.overMany', {
              n: over,
            })
          : t('assignments.wordCount.within')
  const fill = Math.min(1, words / max)
  return (
    <div className="grid gap-1.5" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span
          className={cn(
            'font-medium',
            within ? 'text-success' : words > max ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {message}
        </span>
        <span className="tabular-nums text-muted-foreground">
          <span className="font-medium text-ink">{words}</span>{' '}
          {t('assignments.wordCount.total', { min, max })}
        </span>
      </div>
      <div aria-hidden className="relative h-1.5 overflow-hidden rounded-full bg-teal-mist">
        <span
          className="absolute inset-y-0 border-s border-teal/40"
          style={{ insetInlineStart: `${(min / max) * 100}%` }}
        />
        <span
          className={cn(
            'block h-full origin-left rounded-full rtl:origin-right transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            within ? 'bg-success' : words > max ? 'bg-destructive' : 'bg-teal',
          )}
          style={{ transform: `scaleX(${fill})` }}
        />
      </div>
    </div>
  )
}
