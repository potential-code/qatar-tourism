import { cn } from '@/lib/utils'

/** Live word count against the task's range, in words as well as a bar. */
export function WordCountMeter({ words, min, max }: { words: number; min: number; max: number }) {
  const within = words >= min && words <= max
  const message =
    words === 0
      ? `${min} to ${max} words`
      : words < min
        ? `${min - words} more ${min - words === 1 ? 'word' : 'words'} needed`
        : words > max
          ? `${words - max} ${words - max === 1 ? 'word' : 'words'} over the limit`
          : 'Within the word range'
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
          <span className="font-medium text-ink">{words}</span> / {min} to {max} words
        </span>
      </div>
      <div aria-hidden className="relative h-1.5 overflow-hidden rounded-full bg-teal-mist">
        <span
          className="absolute inset-y-0 border-s border-teal/40"
          style={{ insetInlineStart: `${(min / max) * 100}%` }}
        />
        <span
          className={cn(
            'block h-full origin-left rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            within ? 'bg-success' : words > max ? 'bg-destructive' : 'bg-teal',
          )}
          style={{ transform: `scaleX(${fill})` }}
        />
      </div>
    </div>
  )
}
