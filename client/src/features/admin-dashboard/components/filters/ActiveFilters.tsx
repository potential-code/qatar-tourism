import { RotateCcw, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useFilterSearch } from '../../hooks/useFilterSearch'
import { type FilterLookups, filterChips } from '../../utils/filters'

/**
 * Active filters as removable chips, plus Reset filters (brief §12). `scope` names a fixed
 * cohort (a programme report) so "no filters" does not claim the whole Academy.
 */
export function ActiveFilters({ lookups, scope }: { lookups?: FilterLookups; scope?: string }) {
  const { filters, setFilters, resetFilters } = useFilterSearch()
  const reduce = useReducedMotion()
  const chips = filterChips(filters, lookups)

  return (
    <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2 border-t border-border/60 pt-3">
      <span className="text-xs text-muted-foreground">Active filters:</span>
      {chips.length === 0 ? (
        <span className="text-xs text-ink">
          None. Showing {scope ? `every ${scope} record` : 'the whole Academy'}.
        </span>
      ) : null}
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.span
            key={chip.key}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-teal/25 bg-teal-mist py-0.5 ps-3 pe-1 text-xs text-teal-deep"
          >
            <span className="text-teal-deep/70">{chip.label}:</span>
            <span className="font-medium">{chip.value}</span>
            <button
              type="button"
              aria-label={`Remove ${chip.label} filter`}
              className="grid size-5 place-items-center rounded-full hover:bg-teal/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() =>
                chip.key === 'date'
                  ? setFilters({ from: undefined, to: undefined, dateField: undefined })
                  : setFilters({ [chip.key]: undefined })
              }
            >
              <X className="size-3" aria-hidden />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <Button
        variant="ghost"
        size="sm"
        className="ms-auto rounded-full text-xs"
        onClick={resetFilters}
        disabled={chips.length === 0}
      >
        <RotateCcw aria-hidden /> Reset filters
      </Button>
    </div>
  )
}
