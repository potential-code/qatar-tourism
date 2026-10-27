import { Keyboard, MicOff, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VoiceFallbackProps {
  reason: 'denied' | 'unsupported'
  onShowDemonstration: () => void
  onTypeInstead: () => void
}

const COPY = {
  denied: {
    title: 'Microphone access is blocked',
    body: 'Your browser did not allow the microphone. To use voice, allow it from the address bar and reload. You can also watch a recorded demonstration or type your replies.',
  },
  unsupported: {
    title: 'Voice is not available in this browser',
    body: 'This browser cannot use a microphone here. Watch a recorded demonstration or type your replies instead.',
  },
}

/** Actionable fallback when voice cannot run (brief §17: handle denied microphone access). */
export function VoiceFallback({ reason, onShowDemonstration, onTypeInstead }: VoiceFallbackProps) {
  const copy = COPY[reason]
  return (
    <div
      role="alert"
      className="flex flex-col gap-4 rounded-2xl border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-start"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
        <MicOff aria-hidden className="size-5" />
      </span>
      <div className="grid flex-1 gap-1">
        <p className="font-medium text-ink">{copy.title}</p>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onShowDemonstration}>
            <PlayCircle aria-hidden /> Watch recorded demonstration
          </Button>
          <Button size="sm" onClick={onTypeInstead}>
            <Keyboard aria-hidden /> Type my replies
          </Button>
        </div>
      </div>
    </div>
  )
}
