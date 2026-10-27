import { useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

/**
 * Reveals `text` word by word, like a streamed reply. The full answer is already computed: this
 * is presentation only, and it is instant under reduced motion or once `done` is set.
 */
export function useStreamedText(text: string, enabled: boolean, wordsPerTick = 2, tickMs = 35) {
  const reduce = useReducedMotion()
  const words = text.split(' ')
  const [shown, setShown] = useState(enabled && !reduce ? 0 : words.length)

  useEffect(() => {
    if (!enabled || reduce) {
      setShown(words.length)
      return
    }
    setShown(0)
    const timer = setInterval(() => {
      setShown((n) => {
        if (n + wordsPerTick >= words.length) clearInterval(timer)
        return Math.min(words.length, n + wordsPerTick)
      })
    }, tickMs)
    return () => clearInterval(timer)
  }, [enabled, reduce, words.length, wordsPerTick, tickMs])

  return { text: words.slice(0, shown).join(' '), done: shown >= words.length }
}
