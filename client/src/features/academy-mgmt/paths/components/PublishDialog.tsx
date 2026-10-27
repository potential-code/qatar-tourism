import { ArrowRightLeft, CircleMinus, CirclePlus, PencilLine, ShieldCheck } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePublishPath } from '../queries/paths.queries'
import type { PathVersion } from '../types'
import type { Change } from '../utils/draft'

const CHANGE_ICON = {
  added: CirclePlus,
  removed: CircleMinus,
  changed: PencilLine,
  moved: ArrowRightLeft,
}

/**
 * Publish with the impact shown first (brief §14: "show the impact and preserve completed
 * equivalents"). Migration is opt-in, needs a reason, and never moves completed enrolments.
 */
export function PublishDialog({
  open,
  onOpenChange,
  pathId,
  draft,
  versions,
  changes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathId: string
  draft: PathVersion
  versions: PathVersion[]
  changes: Change[]
}) {
  const publish = usePublishPath(pathId)
  const [note, setNote] = useState('')
  const [migrate, setMigrate] = useState(false)
  const [reason, setReason] = useState('')

  // biome-ignore lint/correctness/useExhaustiveDependencies: prefill the note only when the dialog opens
  useEffect(() => {
    if (open) {
      setNote(changes[0] ? `${changes[0].title}: ${changes[0].detail ?? changes[0].type}` : '')
      setMigrate(false)
      setReason('')
    }
  }, [open])

  const older = versions.filter((v) => v.id !== draft.id)
  const open_ = older.reduce((s, v) => s + v.enrolments.notStarted + v.enrolments.inProgress, 0)
  const completed = older.reduce((s, v) => s + v.enrolments.completed, 0)
  const awaiting = older.reduce((s, v) => s + v.enrolments.awaitingReview, 0)
  const total = older.reduce((s, v) => s + v.enrolments.total, 0)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    publish.mutate(
      { changeNote: note, migrateOpen: migrate, ...(migrate ? { migrationReason: reason } : {}) },
      {
        onSuccess: (result) => {
          toast.success(
            `Version ${result.version} published. ${result.migrated ? `${result.migrated} open enrolments moved; ` : ''}${result.retained} enrolments keep their version.`,
          )
          onOpenChange(false)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">
              Publish version {draft.version}
            </DialogTitle>
            <DialogDescription>
              New enrolments receive version {draft.version}. Existing learners keep their assigned
              version unless you migrate them below.
            </DialogDescription>
          </DialogHeader>

          <section aria-labelledby="changes-title" className="grid gap-2">
            <h3 id="changes-title" className="text-sm font-medium">
              Changes in this version
            </h3>
            {changes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No item changes. Only the version note is new.
              </p>
            ) : (
              <ul className="grid max-h-40 gap-1.5 overflow-y-auto rounded-lg border bg-sand/50 p-3">
                {changes.map((change, i) => {
                  const Icon = CHANGE_ICON[change.type]
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: a change list is static while open
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
                      <span>
                        <span className="font-medium capitalize">{change.type}</span>:{' '}
                        {change.title}
                        {change.detail ? (
                          <span className="text-muted-foreground">, {change.detail}</span>
                        ) : null}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="impact-title" className="grid gap-3">
            <h3 id="impact-title" className="text-sm font-medium">
              Impact on existing learners
            </h3>
            <dl className="grid grid-cols-4 gap-2 rounded-xl border bg-card p-3 text-center">
              {(
                [
                  ['Enrolled on earlier versions', total],
                  ['Open (could migrate)', open_],
                  ['Awaiting review (stay)', awaiting],
                  ['Completed (preserved)', completed],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className="font-display text-2xl tabular-nums text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="flex items-start gap-2 rounded-lg bg-teal-mist/70 p-3 text-xs text-teal-deep">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
              Completed records are preserved on the version they were earned. Unit progress is
              stored per course, so equivalent units already completed carry over to any learner you
              migrate.
            </p>
          </section>

          <div className="grid gap-1.5">
            <Label htmlFor="publish-note">Version note</Label>
            <Textarea
              id="publish-note"
              required
              minLength={5}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="grid gap-3 rounded-xl border p-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="publish-migrate"
                checked={migrate}
                disabled={open_ === 0}
                onCheckedChange={(v) => setMigrate(v === true)}
              />
              <Label htmlFor="publish-migrate" className="grid gap-0.5 font-normal">
                <span className="font-medium">
                  Also migrate {open_} open enrolments to version {draft.version}
                </span>
                <span className="text-xs text-muted-foreground">
                  Not started and in-progress learners only. Off by default.
                </span>
              </Label>
            </div>
            {migrate ? (
              <div className="grid gap-1.5">
                <Label htmlFor="publish-reason">Migration reason</Label>
                <Textarea
                  id="publish-reason"
                  required
                  minLength={5}
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={publish.isPending || note.trim().length < 5}>
              {publish.isPending ? 'Publishing' : `Publish version ${draft.version}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
