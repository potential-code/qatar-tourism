import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const MIN = 4
const MAX = 6

/** Replies so far against the 4 to 6 the scenario needs. */
export function TurnProgress({ turns, done }: { turns: number; done: boolean }) {
  const reduce = useReducedMotion()
  const { t } = useTranslation('learner')
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="flex gap-1">
        {Array.from({ length: MAX }, (_, i) => (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed positions
            key={i}
            initial={false}
            animate={{ scale: i < turns ? 1 : 0.8, opacity: i < turns ? 1 : 0.45 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 20 }}
            className={cn(
              'h-1.5 w-4 rounded-full',
              i < turns
                ? 'bg-teal'
                : i < MIN
                  ? 'bg-teal/25'
                  : 'border border-dashed border-teal/40',
            )}
          />
        ))}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {done
          ? t('roleplay.turns.complete')
          : t(turns === 1 ? 'roleplay.turns.replyOne' : 'roleplay.turns.replyMany', { n: turns })}
      </span>
    </div>
  )
}
