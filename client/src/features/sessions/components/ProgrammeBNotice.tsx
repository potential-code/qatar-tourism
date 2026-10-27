import { Compass } from 'lucide-react'

/** Program B has no required sessions (brief §5–6): say so, and why the optional ones help. */
export function ProgrammeBNotice({ onlyB }: { onlyB: boolean }) {
  return (
    <aside className="flex gap-4 rounded-xl border bg-card p-5 shadow-xs">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-maroon-mist text-maroon-deep">
        <Compass aria-hidden className="size-5" />
      </span>
      <div className="grid gap-1">
        <h2 className="font-display text-xl font-normal text-ink">
          Program B has no required sessions
        </h2>
        <p className="max-w-[70ch] text-sm text-ink-soft">
          {onlyB
            ? 'Visitor Service Essentials is completed entirely self-paced, so you never need to book a session to finish it. '
            : 'Your Program B journey is self-paced and never waits on a session. '}
          The optional clinics below add live practice with a trainer. Booking one does not change
          your completion requirements.
        </p>
      </div>
    </aside>
  )
}
