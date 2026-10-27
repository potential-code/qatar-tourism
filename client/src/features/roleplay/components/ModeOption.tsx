import type { LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { spring } from '@/components/motion/variants'
import { cn } from '@/lib/utils'

interface ModeOptionProps {
  value: string
  icon: LucideIcon
  title: string
  description: string
  checked: boolean
  onSelect: () => void
}

/** A large radio card for choosing Text or Voice. */
export function ModeOption({
  value,
  icon: Icon,
  title,
  description,
  checked,
  onSelect,
}: ModeOptionProps) {
  const reduce = useReducedMotion()
  return (
    <motion.label
      whileHover={reduce ? undefined : { y: -2 }}
      transition={spring}
      className={cn(
        'relative flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
        checked ? 'border-teal bg-teal-mist/60' : 'border-border hover:border-teal/40',
      )}
    >
      <input
        type="radio"
        name="practice-mode"
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors',
          checked ? 'bg-teal text-white' : 'bg-teal-mist text-teal',
        )}
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="grid gap-0.5">
        <span className="font-medium text-ink">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          'absolute end-4 top-4 size-4 rounded-full border-2 transition-colors',
          checked ? 'border-teal bg-teal shadow-[inset_0_0_0_2px_white]' : 'border-border',
        )}
      />
    </motion.label>
  )
}
