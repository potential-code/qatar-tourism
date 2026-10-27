import type { ReactNode } from 'react'

/**
 * Tables scroll inside a labelled container, never the page (CONVENTIONS responsive).
 * `w-0 min-w-full` stops a wide table from widening its ancestors: the box takes the parent's
 * width, and only its own content scrolls.
 */
export function TableFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    // A scrollable region must be keyboard reachable, so it takes focus (WCAG 2.1.1).
    <section
      aria-label={label}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region needs keyboard focus
      tabIndex={0}
      className="w-0 min-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children}
    </section>
  )
}
