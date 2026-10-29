import { useQuery } from '@tanstack/react-query'
import { DatabaseBackup, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api-error'
import { qDate } from '../../hub/utils/format'
import { demoMetaQuery, useResetDemo } from '../queries/demo.queries'

const COUNT_LABELS: Record<string, string> = {
  learners: 'Learners',
  enrolments: 'Enrolments',
  trainers: 'Trainers',
  sessions: 'Sessions',
  rsvps: 'Bookings',
  certificates: 'A certificates',
  notifications: 'Notifications',
  organisations: 'Organisations',
}

/** Named reset restricted to the demo administrator, with confirmation (brief §17). */
export function DemoResetPanel() {
  const meta = useQuery(demoMetaQuery())
  const reset = useResetDemo()
  const [confirming, setConfirming] = useState(false)

  return (
    <section className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-teal-deep to-teal text-white shadow-md">
      <span
        aria-hidden
        className="pointer-events-none absolute -end-20 -top-24 size-72 qt-glow text-teal-soft/25"
      />
      <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-2">
          <p className="flex items-center gap-2 text-sm text-white/75">
            <DatabaseBackup className="size-4" aria-hidden /> Demo snapshot
          </p>
          <h2 className="font-display text-2xl font-light">Reset demo data</h2>
          <p className="max-w-2xl text-sm text-white/80">
            Restores every learner, trainer, session, booking, result, notification and audit record
            to the fictional snapshot, so the walkthrough can be repeated. You stay signed in.
          </p>
        </div>
        <Button
          size="lg"
          variant="glass"
          onClick={() => setConfirming(true)}
          disabled={reset.isPending}
        >
          <RotateCcw /> {reset.isPending ? 'Resetting' : 'Reset demo data'}
        </Button>
        <div className="border-t border-white/15 pt-4 lg:col-span-2">
          {meta.isPending ? (
            <Skeleton className="h-6 w-80 bg-white/20" />
          ) : meta.isError ? (
            <p className="text-sm text-white/80">The snapshot details could not be loaded.</p>
          ) : (
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm md:grid-cols-5 xl:grid-cols-10">
              <div className="col-span-2">
                <dt className="text-white/60">Reference date</dt>
                <dd className="font-display text-lg whitespace-nowrap">
                  {qDate(`${meta.data.referenceDate}T08:00:00+03:00`)}
                </dd>
              </div>
              {Object.entries(meta.data.counts)
                .filter(([key]) => COUNT_LABELS[key])
                .map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-white/60">{COUNT_LABELS[key]}</dt>
                    <dd className="font-display text-lg tabular-nums">
                      {value.toLocaleString('en-GB')}
                    </dd>
                  </div>
                ))}
            </dl>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Reset demo data?"
        description="This resets all fictional demo data to the original snapshot. Changes made during the walkthrough, including new learners, bookings, marks, notifications and audit events, are replaced. No real data is affected and you stay signed in."
        confirmLabel="Reset demo data"
        pending={reset.isPending}
        onConfirm={async () => {
          try {
            const result = await reset.mutateAsync()
            setConfirming(false)
            toast.success('Demo data reset', { description: result.message })
          } catch (error) {
            toast.error(
              error instanceof ApiError
                ? error.message
                : 'The demo data could not be reset. Nothing was changed.',
            )
          }
        }}
      />
    </section>
  )
}
