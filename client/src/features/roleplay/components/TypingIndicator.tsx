import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

/** Three dots while the simulated visitor "types". Announced politely to screen readers. */
export function TypingIndicator() {
  const reduce = useReducedMotion()
  const { t } = useTranslation('learner')
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="flex gap-3"
    >
      <span
        aria-hidden
        className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-maroon-mist font-display text-sm text-maroon-deep"
      >
        V
      </span>
      <div
        role="status"
        className="flex items-center gap-1.5 rounded-2xl rounded-ss-md border border-border bg-white px-4 py-3.5 shadow-xs"
      >
        <span className="sr-only">{t('roleplay.chat.typing')}</span>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="size-2 rounded-full bg-teal-soft"
            animate={reduce ? undefined : { y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.li>
  )
}
