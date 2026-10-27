import { useQuery } from '@tanstack/react-query'
import { PlayCircle, RotateCcw } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { demonstrationQuery } from '../queries/roleplay.queries'
import { ChatThread } from './ChatThread'

/**
 * Clearly labelled prerecorded demonstration, shown when the microphone is denied or speech
 * services are unavailable (brief §1, §9). It plays a model conversation line by line; it is
 * never scored and never saved as the learner's attempt.
 */
export function RecordedDemonstration({
  scenarioKey,
  onClose,
}: {
  scenarioKey: string
  onClose: () => void
}) {
  const reduce = useReducedMotion()
  const { data, isPending, isError, refetch } = useQuery(demonstrationQuery(scenarioKey))
  const [shown, setShown] = useState(1)
  const total = data?.transcript.length ?? 0

  useEffect(() => {
    if (!data || shown >= total) return
    const timer = setTimeout(() => setShown((n) => n + 1), reduce ? 200 : 1500)
    return () => clearTimeout(timer)
  }, [data, shown, total, reduce])

  return (
    <section
      aria-label="Prerecorded demonstration"
      className="flex flex-col overflow-hidden rounded-xl border border-maroon/15 bg-maroon-mist/40"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-maroon/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <PlayCircle aria-hidden className="size-4 text-maroon" />
          <h3 className="text-sm font-medium text-maroon-deep">Prerecorded demonstration</h3>
        </div>
        <SimulatedTag label="Recorded demonstration, not your attempt" />
      </header>
      {isPending ? (
        <div className="grid gap-3 p-5">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="ms-auto h-12 w-2/3" />
        </div>
      ) : isError ? (
        <div className="flex items-center justify-between gap-3 p-5 text-sm">
          <span>The demonstration could not load.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex max-h-[420px] flex-col">
          <ChatThread
            transcript={data.transcript.slice(0, shown)}
            typing={shown < total}
            label="Demonstration conversation"
          />
        </div>
      )}
      <footer className="flex flex-wrap items-center gap-2 border-t border-maroon/10 px-4 py-3">
        <Button size="sm" variant="ghost" onClick={() => setShown(1)} disabled={!data}>
          <RotateCcw aria-hidden /> Replay
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          Practise by typing instead
        </Button>
      </footer>
    </section>
  )
}
