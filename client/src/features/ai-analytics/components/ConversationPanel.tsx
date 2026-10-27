import { MessageSquareDashed, RotateCcw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { Turn } from '../hooks/useConversation'
import { Composer } from './Composer'
import { AssistantBubble, UserBubble } from './MessageBubble'
import { ThinkingIndicator } from './ThinkingIndicator'

/** Chat history, suggested prompt chips and the composer. */
export function ConversationPanel({
  turns,
  prompts,
  pending,
  failedQuestion,
  selectedId,
  onSend,
  onSelect,
  onReset,
}: {
  turns: Turn[]
  prompts: string[]
  pending: boolean
  failedQuestion: string | null
  selectedId: string | null
  onSend: (text: string) => void
  onSelect: (id: string) => void
  onReset: () => void
}) {
  const endRef = useRef<HTMLDivElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to the newest turn when the thread grows or the assistant starts thinking
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, pending])

  return (
    <section
      aria-label="Conversation"
      className="flex h-[calc(100dvh-13rem)] min-h-[560px] flex-col overflow-hidden rounded-xl border bg-sand-deep/40 shadow-[var(--qt-shadow-sm)]"
    >
      <header className="flex items-center justify-between border-b bg-card px-5 py-3">
        <div>
          <h2 className="text-sm font-medium text-ink">Chat history</h2>
          <p className="text-xs text-muted-foreground">
            {turns.length
              ? `${turns.filter((t) => t.role === 'user').length} questions this session`
              : 'No questions yet'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} disabled={!turns.length || pending}>
          <RotateCcw aria-hidden /> New conversation
        </Button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {turns.length === 0 ? (
          <div className="grid h-full place-content-center justify-items-center gap-3 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-teal-mist text-teal">
              <MessageSquareDashed className="size-5" aria-hidden />
            </span>
            <p className="font-display text-xl text-ink">Ask about the Academy</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Pick a suggested question or type your own. The assistant reads the governed metrics
              only and never changes data.
            </p>
          </div>
        ) : (
          turns.map((turn) =>
            turn.role === 'user' ? (
              <UserBubble key={turn.id} text={turn.text} />
            ) : (
              <AssistantBubble
                key={turn.id}
                answer={turn.answer}
                fresh={turn.fresh}
                selected={turn.id === selectedId}
                onSelect={() => onSelect(turn.id)}
                onAsk={onSend}
              />
            ),
          )
        )}
        {pending ? <ThinkingIndicator /> : null}
        {failedQuestion && !pending ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            The assistant could not be reached.{' '}
            <button
              type="button"
              className="font-medium underline"
              onClick={() => onSend(failedQuestion)}
            >
              Try again
            </button>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="grid gap-3 border-t bg-card p-4">
        <section
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          aria-label="Suggested prompts"
        >
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={pending}
              onClick={() => onSend(prompt)}
              className="shrink-0 rounded-full border border-teal/25 bg-white px-3 py-1.5 text-xs text-teal-deep transition hover:border-teal hover:bg-teal-mist focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </section>
        <Composer onSend={onSend} pending={pending} />
      </div>
    </section>
  )
}
