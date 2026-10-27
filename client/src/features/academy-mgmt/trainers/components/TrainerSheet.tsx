import type { ProgrammeCode } from '@shared/constants'
import type { Access } from '@shared/permissions'
import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { useQuery } from '@tanstack/react-query'
import { Ban, CalendarDays, CircleCheck, PencilLine, ShieldHalf, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PersonAvatar } from '@/components/data/PersonAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ApiError } from '@/lib/api'
import { ErrorPanel } from '../../hub/components/QueryStates'
import { ReasonDialog } from '../../hub/components/ReasonDialog'
import { StatusPill } from '../../hub/components/StatusPill'
import { humanise, qDateTime } from '../../hub/utils/format'
import { trainerDetailQuery, useSetTrainerProgrammes } from '../queries/trainers.queries'
import { TrainerFormDialog } from './TrainerFormDialog'

const ACCESS: Record<Access, { label: string; tone: 'good' | 'info' | 'muted' | 'bad' }> = {
  authorised: { label: 'Authorised', tone: 'good' },
  assigned: { label: 'Assigned only', tone: 'info' },
  own: { label: 'Own only', tone: 'info' },
  none: { label: 'No access', tone: 'muted' },
}

/** Trainer profile, approved programmes and role-based rights (brief §14 Trainer management). */
export function TrainerSheet({
  trainerId,
  onClose,
}: {
  trainerId: string | null
  onClose: () => void
}) {
  const query = useQuery({ ...trainerDetailQuery(trainerId ?? ''), enabled: Boolean(trainerId) })
  const setProgrammes = useSetTrainerProgrammes(trainerId ?? '')
  const [draft, setDraft] = useState<ProgrammeCode[]>([])
  const [confirm, setConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const approved = query.data?.trainer.programmes

  useEffect(() => {
    if (approved) setDraft(approved)
  }, [approved])

  const dirty = approved ? [...draft].sort().join() !== [...approved].sort().join() : false
  const t = query.data?.trainer

  return (
    <Sheet open={Boolean(trainerId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {query.isPending ? (
          <div className="grid gap-4 p-6">
            <Skeleton className="h-20" />
            <Skeleton className="h-40" />
            <Skeleton className="h-64" />
          </div>
        ) : query.isError ? (
          <div className="p-6">
            <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
          </div>
        ) : t ? (
          <>
            <SheetHeader className="border-b bg-sand/60 p-6">
              <div className="flex items-center gap-4">
                <PersonAvatar
                  name={t.fullName}
                  src={t.avatarPath}
                  className="size-16 text-lg"
                  fallbackClassName="bg-teal font-display text-xl text-white"
                />
                <div className="grid gap-0.5">
                  <SheetTitle className="font-display text-2xl font-normal">
                    {t.fullName}
                  </SheetTitle>
                  <SheetDescription>
                    {t.code} | {t.headline}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <div className="grid gap-8 p-6">
              <section className="grid gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-medium text-ink">
                    <UserRound className="size-4 text-teal" aria-hidden /> Profile
                  </h3>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    <PencilLine /> Edit profile
                  </Button>
                </div>
                <p className="text-sm leading-relaxed text-ink/80">{t.bio}</p>
                <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Expertise</dt>
                  <dd className="flex flex-wrap gap-1">
                    {t.expertise.map((x) => (
                      <Badge key={x} variant="outline">
                        {x}
                      </Badge>
                    ))}
                  </dd>
                  <dt className="text-muted-foreground">Languages</dt>
                  <dd>{t.languages.join(', ')}</dd>
                  <dt className="text-muted-foreground">Organisation</dt>
                  <dd>{t.organisation}</dd>
                  <dt className="text-muted-foreground">Account</dt>
                  <dd>{t.email}</dd>
                </dl>
                <p className="rounded-lg bg-maroon-mist px-3 py-2 text-xs text-maroon-deep">
                  Fictional trainer for demonstration. The portrait is AI-generated and shows no
                  real person.
                </p>
              </section>

              <section className="grid gap-3">
                <h3 className="flex items-center gap-2 font-medium text-ink">
                  <CircleCheck className="size-4 text-teal" aria-hidden /> Approved programmes
                </h3>
                <p className="text-sm text-muted-foreground">
                  A trainer can create and run sessions only for approved programmes. Changes are
                  audited as permission changes with a reason.
                </p>
                <div className="grid gap-2">
                  {(['A', 'B', 'C'] as const).map((code) => (
                    <label
                      key={code}
                      htmlFor={`approve-${code}`}
                      className="flex items-center justify-between rounded-xl border px-4 py-3"
                    >
                      <span className="text-sm font-medium">{PROGRAMME_LABELS[code]}</span>
                      <Switch
                        id={`approve-${code}`}
                        checked={draft.includes(code)}
                        onCheckedChange={(on) =>
                          setDraft(on ? [...draft, code] : draft.filter((p) => p !== code))
                        }
                        aria-label={`Approved for ${PROGRAMME_LABELS[code]}`}
                      />
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  {dirty ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => approved && setDraft(approved)}
                    >
                      Discard
                    </Button>
                  ) : null}
                  <Button size="sm" disabled={!dirty} onClick={() => setConfirm(true)}>
                    Save approvals
                  </Button>
                </div>
              </section>

              <section className="grid gap-3">
                <h3 className="flex items-center gap-2 font-medium text-ink">
                  <ShieldHalf className="size-4 text-teal" aria-hidden /> Session rights and
                  reporting permissions
                </h3>
                <p className="text-sm text-muted-foreground">
                  Rights come from the trainer role in the permission matrix. Exports are limited to
                  learner ID and score; learner contact details are hidden.
                </p>
                <ul className="divide-y rounded-xl border">
                  {query.data.rights.map((r) => (
                    <li
                      key={r.action}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                    >
                      <div className="grid">
                        <span className="text-ink">{r.label}</span>
                        <span className="text-xs text-muted-foreground">{r.note}</span>
                      </div>
                      {r.access === 'none' ? (
                        <StatusPill tone="muted">
                          <Ban className="sr-only" /> No access
                        </StatusPill>
                      ) : (
                        <StatusPill tone={ACCESS[r.access].tone}>
                          {ACCESS[r.access].label}
                        </StatusPill>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="grid gap-3">
                <h3 className="flex items-center gap-2 font-medium text-ink">
                  <CalendarDays className="size-4 text-teal" aria-hidden /> Sessions
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <Stat label="Sessions" value={query.data.sessions.length} />
                  <Stat label="Attendance records" value={query.data.attendanceRecords} />
                  <Stat label="Reviews completed" value={query.data.reviewsCompleted} />
                </div>
                <ul className="grid gap-2">
                  {query.data.sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-sand/60 px-3 py-2 text-sm"
                    >
                      <div className="grid">
                        <span className="font-medium">{s.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.code} | Program {s.programme} | {qDateTime(s.startsAt)} Qatar time
                        </span>
                      </div>
                      <StatusPill
                        tone={
                          s.status === 'cancelled'
                            ? 'bad'
                            : s.status === 'completed'
                              ? 'neutral'
                              : 'info'
                        }
                      >
                        {humanise(s.status)}
                      </StatusPill>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <ReasonDialog
              open={confirm}
              onOpenChange={setConfirm}
              title="Change approved programmes"
              description={`From ${approved?.join(', ') || 'none'} to ${draft.sort().join(', ') || 'none'}. This is a permission change and is recorded in the audit trail.`}
              confirmLabel="Save approvals"
              pending={setProgrammes.isPending}
              onConfirm={async (reason) => {
                try {
                  await setProgrammes.mutateAsync({ programmes: draft, reason })
                  toast.success('Approved programmes updated', {
                    description: 'Recorded as a permission change.',
                  })
                  setConfirm(false)
                } catch (e) {
                  toast.error(e instanceof ApiError ? e.message : 'The change could not be saved')
                }
              }}
            />
            <TrainerFormDialog
              open={editing}
              onOpenChange={setEditing}
              trainerId={t.id}
              initial={{
                fullName: t.fullName,
                headline: t.headline,
                bio: t.bio,
                expertise: t.expertise.join(', '),
                languages: t.languages.join(', '),
                organisation: t.organisation,
              }}
            />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="font-display text-2xl tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
