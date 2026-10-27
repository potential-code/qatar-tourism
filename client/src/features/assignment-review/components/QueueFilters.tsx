import { MARKING_QUEUE_FILTERS } from '@shared/schemas/assignment-marking'
import { Search } from 'lucide-react'
import { motion } from 'motion/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type QueueStatus = (typeof MARKING_QUEUE_FILTERS)[number]

const LABEL: Record<QueueStatus, string> = {
  open: 'To mark',
  returned: 'Returned',
  approved: 'Approved',
  all: 'All',
}

interface QueueFiltersProps {
  status: QueueStatus
  counts: Record<QueueStatus, number> | undefined
  programme: 'all' | 'A' | 'B'
  search: string
  onStatus: (status: QueueStatus) => void
  onProgramme: (programme: 'all' | 'A' | 'B') => void
  onSearch: (search: string) => void
}

/** Status tabs with counts, a programme filter and a learner search. */
export function QueueFilters(props: QueueFiltersProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div
        role="tablist"
        aria-label="Submission status"
        className="flex w-full gap-1 overflow-x-auto rounded-full bg-sand-deep p-1 lg:w-fit"
      >
        {MARKING_QUEUE_FILTERS.map((key) => {
          const active = props.status === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => props.onStatus(key)}
              className={cn(
                'relative shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                active ? 'text-white' : 'text-muted-foreground hover:text-ink',
              )}
            >
              {active ? (
                <motion.span
                  layoutId="queue-tab"
                  className="absolute inset-0 rounded-full bg-teal shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative">
                {LABEL[key]}
                {props.counts ? (
                  <span
                    className={cn(
                      'ms-1.5 tabular-nums',
                      active ? 'text-white/80' : 'text-muted-foreground',
                    )}
                  >
                    {props.counts[key]}
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,260px)]">
        <div className="grid gap-1.5">
          <Label htmlFor="queue-programme">Programme</Label>
          <Select
            value={props.programme}
            onValueChange={(v) => props.onProgramme(v as 'all' | 'A' | 'B')}
          >
            <SelectTrigger id="queue-programme" className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programmes</SelectItem>
              <SelectItem value="A">Program A</SelectItem>
              <SelectItem value="B">Program B</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="queue-search">Search learners</Label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="queue-search"
              value={props.search}
              onChange={(event) => props.onSearch(event.target.value)}
              placeholder="Learner ID or name"
              className="bg-white ps-9"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
