import type { AnalyticsAnswer } from '@shared/schemas/admin-ai'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAsk } from '../queries/ai.queries'

export type Turn =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; answer: AnalyticsAnswer; fresh: boolean }

const STORAGE_KEY = 'qta.ai-analytics.thread'

function load(): Turn[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as Turn[]).map((t) =>
      t.role === 'assistant' ? { ...t, fresh: false } : t,
    )
  } catch {
    return []
  }
}

/**
 * The chat history for this browser tab (kept in sessionStorage so leaving the page and coming
 * back keeps the thread) and the answer selected for the results canvas.
 */
export function useConversation() {
  const [turns, setTurns] = useState<Turn[]>(load)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const last = [...turns]
      .reverse()
      .find((t) => t.role === 'assistant' && t.answer.kind === 'answer')
    return last?.id ?? null
  })
  const ask = useAsk()

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-40)))
    } catch {
      // Storage can be unavailable (private mode); the thread still works for this visit.
    }
  }, [turns])

  const send = useCallback(
    (text: string) => {
      const question = text.trim()
      if (!question || ask.isPending) return
      setTurns((t) => [...t, { id: crypto.randomUUID(), role: 'user', text: question }])
      ask.mutate(question, {
        onSuccess: (answer) => {
          setTurns((t) => [...t, { id: answer.id, role: 'assistant', answer, fresh: true }])
          // Clarifications and refusals stay in the thread; the canvas keeps the last answer.
          if (answer.kind === 'answer') setSelectedId(answer.id)
        },
        onError: (error) =>
          toast.error('The assistant could not answer', {
            description: `${error instanceof Error ? error.message : 'Network error'}. Your question is still in the thread; try again.`,
          }),
      })
    },
    [ask],
  )

  const reset = useCallback(() => {
    setTurns([])
    setSelectedId(null)
  }, [])

  const selected = turns.find(
    (t): t is Extract<Turn, { role: 'assistant' }> => t.role === 'assistant' && t.id === selectedId,
  )

  return {
    turns,
    send,
    reset,
    pending: ask.isPending,
    failedQuestion: ask.isError ? ask.variables : null,
    selected: selected?.answer ?? null,
    selectedFresh: selected?.fresh ?? false,
    select: setSelectedId,
    selectedId,
  }
}
