import { ROLEPLAY_RUBRIC } from '@shared/constants'
import { CheckCircle2, RotateCcw, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Goal and the five things the feedback looks at, beside the conversation. */
export function PracticeSidePanel({
  objective,
  onRestart,
}: {
  objective: string
  onRestart: () => void
}) {
  return (
    <aside className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-xs">
      <div className="grid gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-teal">
          <Target aria-hidden className="size-4" /> Your goal
        </h2>
        <p className="text-[15px] leading-relaxed text-ink">{objective}</p>
      </div>
      <div className="grid gap-2">
        <h2 className="text-sm font-medium text-ink">Feedback looks at</h2>
        <ul className="grid gap-2">
          {ROLEPLAY_RUBRIC.map((criterion) => (
            <li
              key={criterion.key}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-soft" />
              {criterion.label}
            </li>
          ))}
        </ul>
      </div>
      <Button variant="ghost" size="sm" className="self-start" onClick={onRestart}>
        <RotateCcw aria-hidden /> Start over
      </Button>
    </aside>
  )
}
