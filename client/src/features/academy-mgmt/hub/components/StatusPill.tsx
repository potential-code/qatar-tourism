import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CircleSlash,
  Clock,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral' | 'muted'

const TONES: Record<Tone, { cls: string; Icon: typeof CircleCheck }> = {
  good: { cls: 'border-success/25 bg-success/10 text-success', Icon: CircleCheck },
  warn: { cls: 'border-warning/30 bg-warning/10 text-warning', Icon: Clock },
  bad: { cls: 'border-destructive/25 bg-destructive/10 text-destructive', Icon: CircleSlash },
  info: { cls: 'border-teal/25 bg-teal-mist text-teal-deep', Icon: CircleDashed },
  neutral: { cls: 'border-border bg-sand-deep text-ink', Icon: CircleMinus },
  muted: { cls: 'border-border bg-muted text-muted-foreground', Icon: CircleAlert },
}

/** Status with an icon AND a word: never colour alone (CONVENTIONS accessibility). */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: Tone
  children: ReactNode
  className?: string
}) {
  const { cls, Icon } = TONES[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        cls,
        className,
      )}
    >
      <Icon aria-hidden className="size-3" />
      {children}
    </span>
  )
}
