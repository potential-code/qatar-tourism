import { CheckCircle2, Circle, Clock3, CornerUpLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Tone } from '../utils/status'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'border-border bg-white text-muted-foreground',
  info: 'border-teal/25 bg-teal-mist text-teal-deep',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  success: 'border-success/30 bg-success/10 text-success',
}

const TONE_ICON = { neutral: Circle, info: Clock3, warning: CornerUpLeft, success: CheckCircle2 }

/** English status words (utils/status.ts) and their keys, so a label shows in the active language. */
const LABEL_KEY = {
  Submitted: 'submitted',
  'Under review': 'underReview',
  'Returned for revision': 'returned',
  Approved: 'approved',
  'Not started': 'notStarted',
  'Waiting for your trainer': 'waiting',
} as const

/** Status as icon plus words, never colour alone. */
export function StatusPill({
  label,
  tone,
  className,
}: {
  label: string
  tone: Tone
  className?: string
}) {
  const { t } = useTranslation('learner')
  const Icon = TONE_ICON[tone]
  const key = LABEL_KEY[label as keyof typeof LABEL_KEY]
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {key ? t(`assignments.status.${key}`) : label}
    </span>
  )
}
