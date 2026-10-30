import { ExternalLink, FlaskConical } from 'lucide-react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Panel } from '../../hub/components/Panel'
import { StatusPill } from '../../hub/components/StatusPill'
import {
  ARTICULATE_LABEL,
  ARTICULATE_MISSING_TESTS,
  ARTICULATE_RTL_GUIDANCE,
} from '../utils/articulate'

/** A non-interactive wireframe of a Rise-style lesson. Decorative: it is not a package. */
function Wireframe({ rtl }: { rtl?: boolean }) {
  return (
    <div
      aria-hidden
      dir={rtl ? 'rtl' : 'ltr'}
      className="grid gap-2 rounded-lg border border-dashed bg-sand p-3"
    >
      <div className="h-3 w-2/5 rounded bg-teal/30" />
      <div className="h-2 w-full rounded bg-border" />
      <div className="h-2 w-5/6 rounded bg-border" />
      <div className="mt-1 grid grid-cols-3 gap-2">
        <div className="h-10 rounded bg-teal-mist" />
        <div className="h-10 rounded bg-teal-mist" />
        <div className="h-10 rounded bg-teal-mist" />
      </div>
      <div
        className={
          rtl
            ? 'h-5 w-16 justify-self-start rounded-full bg-teal/40'
            : 'h-5 w-16 justify-self-end rounded-full bg-teal/40'
        }
      />
    </div>
  )
}

export function ArticulateRow() {
  return (
    <Panel
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          Articulate course
          <SimulatedTag label={ARTICULATE_LABEL} />
        </span>
      }
      description="No Articulate authoring access or export is available for this trial. The visual below is a simulated outline, not a working package."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="grid gap-3">
          <p className="text-sm font-medium text-ink">{ARTICULATE_LABEL}</p>
          <Wireframe />
          <Wireframe rtl />
          <a
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal underline-offset-4 hover:underline"
            href={ARTICULATE_RTL_GUIDANCE}
            target="_blank"
            rel="noreferrer"
          >
            Articulate guidance on right-to-left courses{' '}
            <ExternalLink aria-hidden className="size-3.5" />
          </a>
        </div>
        <div className="grid gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FlaskConical aria-hidden className="size-4 text-teal" /> Package tests that need an
            Articulate export
          </h3>
          <ul className="grid gap-2">
            {ARTICULATE_MISSING_TESTS.map((test) => (
              <li
                key={test.title}
                className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
              >
                <div className="grid gap-0.5">
                  <p className="text-sm font-medium text-ink">{test.title}</p>
                  <p className="text-xs text-muted-foreground">{test.detail}</p>
                </div>
                <StatusPill tone="muted" className="shrink-0">
                  Not run
                </StatusPill>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  )
}
