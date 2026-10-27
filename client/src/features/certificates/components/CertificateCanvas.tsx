import { ArchFrame } from '@/components/brand/ArchFrame'
import { qatarDate } from '@/lib/format/qatar-time'
import { cn } from '@/lib/utils'

/**
 * On-screen demo certificate, matching the PDF: watermarked DEMONSTRATION ONLY across the
 * design, the arch motif as the single accent, and wording that never implies a licence.
 */
export function CertificateCanvas({
  learnerName,
  programmeTitle,
  code,
  completedAt,
  status,
}: {
  learnerName: string
  programmeTitle: string
  code: string
  completedAt: string
  status: 'issued' | 'revoked'
}) {
  return (
    <figure
      aria-label={`Demonstration certificate ${code} for ${learnerName}`}
      className="relative isolate overflow-hidden rounded-xl border bg-sand shadow-lg"
    >
      <span aria-hidden className="absolute inset-y-0 start-0 w-2 bg-teal" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 flex flex-col items-center justify-center gap-24 select-none"
      >
        {[0, 1].map((i) => (
          <p
            key={i}
            className="-rotate-[22deg] whitespace-nowrap font-sans text-5xl font-semibold tracking-wide text-maroon/[0.08] sm:text-7xl"
          >
            DEMONSTRATION ONLY
          </p>
        ))}
      </div>
      <div className="m-3 flex flex-col items-center gap-4 border border-border/80 px-4 py-8 text-center sm:m-6 sm:gap-5 sm:px-10 sm:py-10">
        <ArchFrame className="w-28 sm:w-36">
          <div className="grid aspect-[3/4] place-items-center bg-teal-mist p-4 pt-10">
            <img src="/brand/qatar-tourism-logo.svg" alt="Qatar Tourism" className="w-full" />
          </div>
        </ArchFrame>
        <p className="text-xs font-medium tracking-[0.18em] text-teal-deep">
          QATAR TOURISM ACADEMY
        </p>
        <p className="font-display text-3xl font-light text-ink sm:text-4xl">
          Certificate of training completion
        </p>
        <p className="font-display text-base italic text-muted-foreground">
          This demonstration record confirms that
        </p>
        <p className="font-display text-4xl text-teal-deep sm:text-5xl">{learnerName}</p>
        <span aria-hidden className="h-px w-64 max-w-full bg-border" />
        <p className="font-display text-base italic text-muted-foreground">
          completed every requirement of
        </p>
        <p className="text-lg font-semibold text-ink">Program A: {programmeTitle}</p>
        <dl className="mt-2 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ['Completion date', qatarDate(completedAt, { month: 'long' })],
            ['Demo certificate ID', code],
            ['Status', status === 'issued' ? 'Issued (demo record)' : 'Revoked'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] tracking-wider text-muted-foreground uppercase">
                {label}
              </dt>
              <dd
                className={cn(
                  'font-semibold text-ink',
                  label === 'Status' && status === 'revoked' && 'text-destructive',
                )}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <figcaption className="mt-2 max-w-xl text-xs text-maroon">
          Training completion certificate for a fictional demonstration. It is not a guide licence,
          permit or official qualification.
        </figcaption>
      </div>
    </figure>
  )
}
