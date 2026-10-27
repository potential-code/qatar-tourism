import type { AnalyticsAnswer } from '@shared/schemas/admin-ai'
import { BarChart3, HelpCircle, ShieldAlert, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useStreamedText } from '../hooks/useStreamedText'

const KIND = {
  answer: { icon: BarChart3, label: 'Answer' },
  clarify: { icon: HelpCircle, label: 'Clarifying question' },
  unsupported: { icon: ShieldAlert, label: 'Not available' },
  refused: { icon: ShieldAlert, label: 'Not permitted' },
} as const

export function UserBubble({ text }: { text: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="ms-auto max-w-[85%] rounded-2xl rounded-se-sm bg-teal px-4 py-2.5 text-sm text-white shadow-sm"
    >
      {text}
    </motion.div>
  )
}

/** An assistant turn: streamed prose, clarifying choices, and a link into the canvas. */
export function AssistantBubble({
  answer,
  fresh,
  selected,
  onSelect,
  onAsk,
}: {
  answer: AnalyticsAnswer
  fresh: boolean
  selected: boolean
  onSelect: () => void
  onAsk: (prompt: string) => void
}) {
  const reduce = useReducedMotion()
  const { text, done } = useStreamedText(answer.prose, fresh)
  const meta = KIND[answer.kind]
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[92%]"
    >
      <div
        className={cn(
          'rounded-2xl rounded-ss-sm border bg-white px-4 py-3 text-sm shadow-xs transition-shadow',
          selected && answer.kind === 'answer' && 'border-teal/40 ring-2 ring-teal/15',
        )}
      >
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-teal-deep">
          <Sparkles className="size-3" aria-hidden />
          Demo analytics assistant
          <span className="text-muted-foreground">· {meta.label}</span>
        </p>
        <p className="leading-relaxed text-ink" aria-live={fresh ? 'polite' : undefined}>
          {text}
          {!done ? (
            <span
              className="ms-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-teal/60 align-text-bottom"
              aria-hidden
            />
          ) : null}
        </p>
        {done && answer.options.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {answer.options.map((option) => (
              <button
                key={option.prompt}
                type="button"
                onClick={() => onAsk(option.prompt)}
                className="rounded-full border border-teal/30 bg-teal-mist px-3 py-1 text-xs font-medium text-teal-deep transition hover:-translate-y-0.5 hover:border-teal focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {answer.kind === 'answer' ? (
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            'mt-1.5 ms-1 inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline',
            selected ? 'text-teal-deep' : 'text-muted-foreground',
          )}
        >
          <meta.icon className="size-3" aria-hidden />
          {selected ? 'Shown in the results canvas' : 'Show in the results canvas'}
        </button>
      ) : null}
    </motion.div>
  )
}
