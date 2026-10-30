import { Volume2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { spring } from '@/components/motion/variants'
import { tr } from '@/i18n/localised'
import { cn } from '@/lib/utils'
import type { TranscriptTurn } from '../types'

interface ChatBubbleProps {
  turn: TranscriptTurn
  /** Offers a replay button on visitor lines when the visitor's voice is available. */
  onSpeak?: (text: string) => void
  className?: string
}

/** One line of the conversation. The visitor sits at the start, the learner at the end. */
export function ChatBubble({ turn, onSpeak, className }: ChatBubbleProps) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('learner')
  const visitor = turn.speaker === 'visitor'
  // The scripted visitor lines are stored in English; the learner's own words show as typed.
  const text = visitor ? tr(turn.text, i18n.language) : turn.text
  return (
    <motion.li
      layout={reduce ? false : 'position'}
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      className={cn('flex w-full gap-3', visitor ? 'justify-start' : 'justify-end', className)}
    >
      {visitor ? (
        <span
          aria-hidden
          className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-maroon-mist font-display text-sm text-maroon-deep"
        >
          V
        </span>
      ) : null}
      <div
        className={cn('flex max-w-[85%] flex-col gap-1 sm:max-w-[75%]', !visitor && 'items-end')}
      >
        <span className="text-[11px] font-medium text-muted-foreground">
          {visitor ? t('roleplay.chat.visitor') : t('roleplay.chat.you')}
        </span>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-xs',
            visitor
              ? 'rounded-ss-md border border-border bg-white text-ink'
              : 'rounded-se-md bg-teal text-white',
          )}
        >
          {text}
        </div>
        {visitor && onSpeak ? (
          <button
            type="button"
            onClick={() => onSpeak(text)}
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-teal-deep transition-colors hover:bg-teal-mist focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Volume2 aria-hidden className="size-3.5" />
            {t('roleplay.chat.playVisitor')}
          </button>
        ) : null}
      </div>
    </motion.li>
  )
}
