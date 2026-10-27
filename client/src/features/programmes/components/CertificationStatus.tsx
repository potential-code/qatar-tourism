import { Award, CircleSlash, Sparkle } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Certification status as icon plus text, never colour alone (brief §18). */
export function CertificationStatus({
  certified,
  illustrative,
  className,
}: {
  certified: boolean
  illustrative?: boolean
  className?: string
}) {
  const [Icon, label] = illustrative
    ? [Sparkle, 'Sample overview, no certificate']
    : certified
      ? [Award, 'Demonstration certificate']
      : [CircleSlash, 'No certificate']
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon aria-hidden className="size-4 shrink-0" />
      {label}
    </span>
  )
}
