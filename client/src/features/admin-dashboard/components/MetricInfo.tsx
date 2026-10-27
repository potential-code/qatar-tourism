import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** The governed definition behind a widget (brief §12 "one consistent reporting definition"). */
export function MetricInfo({ label, definition }: { label: string; definition: string }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`How ${label} is calculated`}
        className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-teal-mist hover:text-teal focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <Info className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-xl text-sm">
        <p className="font-medium text-ink">{label}</p>
        <p className="mt-1 leading-relaxed text-muted-foreground">{definition}</p>
      </PopoverContent>
    </Popover>
  )
}
