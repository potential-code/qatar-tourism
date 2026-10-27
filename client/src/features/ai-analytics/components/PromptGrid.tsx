import {
  Award,
  BarChart3,
  CalendarCheck,
  ClipboardList,
  Hourglass,
  type LucideIcon,
  TrendingUp,
  Users,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Stagger, StaggerItem } from '@/components/motion'

const ICONS: LucideIcon[] = [
  Users,
  BarChart3,
  TrendingUp,
  ClipboardList,
  CalendarCheck,
  Award,
  Hourglass,
]

/** The brief §13 suggested prompts as cards, for the empty canvas. */
export function PromptGrid({
  prompts,
  onAsk,
  disabled,
}: {
  prompts: string[]
  onAsk: (p: string) => void
  disabled: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <Stagger className="grid grid-cols-2 gap-3">
      {prompts.map((prompt, index) => {
        const Icon = ICONS[index] ?? BarChart3
        return (
          <StaggerItem
            key={prompt}
            className={
              index === prompts.length - 1 && prompts.length % 2 ? 'col-span-2' : undefined
            }
          >
            <motion.button
              type="button"
              disabled={disabled}
              onClick={() => onAsk(prompt)}
              whileHover={reduce ? undefined : { y: -3 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              className="group flex h-full w-full items-start gap-3 rounded-xl border bg-white p-4 text-start text-sm text-ink shadow-xs transition-colors hover:border-teal/40 hover:bg-teal-mist/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-mist text-teal transition-colors group-hover:bg-teal group-hover:text-white">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="pt-1 leading-snug">{prompt}</span>
            </motion.button>
          </StaggerItem>
        )
      })}
    </Stagger>
  )
}
