import { useReducedMotion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { requestVisitorTurn } from '../queries/roleplay.queries'
import type { TranscriptTurn } from '../types'

/** Typing indicator time for a reply, so the scripted visitor reads like a person. */
function typingDelay(text: string, reduce: boolean) {
  if (reduce) return 150
  return Math.min(1600, 550 + text.length * 9)
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Drives one scripted conversation. The browser keeps only the learner's own replies; every
 * visitor line comes from the server, which replays the script from those replies.
 * A failed request keeps the learner's text so nothing they wrote is lost.
 */
export function useConversation(scenarioKey: string, opening: string) {
  const reduce = useReducedMotion() ?? false
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([
    { speaker: 'visitor', text: opening },
  ])
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [failedReply, setFailedReply] = useState<string | null>(null)
  const learnerTurns = useRef<string[]>([])

  const send = useCallback(
    async (text: string) => {
      const reply = text.trim()
      if (!reply || pending || done) return
      const turns = [...learnerTurns.current, reply]
      setFailedReply(null)
      setPending(true)
      setTranscript((current) => [...current, { speaker: 'learner', text: reply }])
      try {
        const started = Date.now()
        const result = await requestVisitorTurn({ scenarioKey, learnerTurns: turns })
        const remaining = typingDelay(result.reply, reduce) - (Date.now() - started)
        if (remaining > 0) await wait(remaining)
        learnerTurns.current = turns
        setTranscript(result.transcript)
        setDone(result.done)
        return result.reply
      } catch {
        setTranscript((current) => current.slice(0, -1))
        setFailedReply(reply)
        return undefined
      } finally {
        setPending(false)
      }
    },
    [scenarioKey, pending, done, reduce],
  )

  const reset = useCallback(() => {
    learnerTurns.current = []
    setTranscript([{ speaker: 'visitor', text: opening }])
    setDone(false)
    setFailedReply(null)
  }, [opening])

  return {
    transcript,
    learnerTurns: learnerTurns.current,
    turnCount: transcript.filter((t) => t.speaker === 'learner').length,
    pending,
    done,
    failedReply,
    send,
    reset,
  }
}
