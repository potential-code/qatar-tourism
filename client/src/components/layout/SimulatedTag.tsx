import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Labels any capability that is not live: scripted AI, simulated SSO/CRM, demo email,
 * online-classroom adapters (brief §1, §9; Rawzaba's email). Never remove it from a simulated feature.
 */
export function SimulatedTag({
  label = 'Simulated',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-teal/20 bg-teal-mist px-2 py-0.5 text-[11px] font-medium text-teal-deep',
        className,
      )}
    >
      <Sparkles aria-hidden className="size-3" />
      {label}
    </span>
  )
}
