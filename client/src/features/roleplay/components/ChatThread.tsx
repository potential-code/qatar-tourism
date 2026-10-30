import { AnimatePresence } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { TranscriptTurn } from '../types'
import { ChatBubble } from './ChatBubble'
import { TypingIndicator } from './TypingIndicator'

interface ChatThreadProps {
  transcript: TranscriptTurn[]
  typing?: boolean
  onSpeak?: (text: string) => void
  label?: string
  /** Follow new lines as they arrive. Off for a finished transcript read from the top. */
  follow?: boolean
}

/** Scrolling conversation log. New lines are announced to assistive technology. */
export function ChatThread({ transcript, typing, onSpeak, label, follow = true }: ChatThreadProps) {
  const { t } = useTranslation('learner')
  const scroller = useRef<HTMLDivElement>(null)
  const count = transcript.length

  // Scrolls the thread itself, never the page around it.
  useEffect(() => {
    const el = scroller.current
    if (!follow || !el || (count < 2 && !typing)) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [count, typing, follow])

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      <ol
        aria-label={label ?? t('roleplay.chat.conversation')}
        aria-live="polite"
        className="flex flex-col gap-4"
      >
        {transcript.map((turn, i) => (
          <ChatBubble
            // Turns are append-only, so the index is a stable identity.
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript
            key={i}
            turn={turn}
            onSpeak={onSpeak}
          />
        ))}
        <AnimatePresence>{typing ? <TypingIndicator key="typing" /> : null}</AnimatePresence>
      </ol>
    </div>
  )
}
