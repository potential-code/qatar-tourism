import type { ProgrammeCode } from '@shared/constants'
import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useOverridePath } from '../queries/paths.queries'
import type { MatchPreview, PathSummary } from '../types'

/** Manual path override with a reason (brief §4, §14). Audited as enrolment.path_override. */
export function OverrideDialog({
  preview,
  programme,
  paths,
  onOpenChange,
}: {
  preview: MatchPreview | null
  programme: ProgrammeCode
  paths: PathSummary[]
  onOpenChange: (open: boolean) => void
}) {
  const override = useOverridePath()
  const enrolment = preview?.learner.enrolments.find((e) => e.programme === programme)
  const choices = paths.filter((p) => p.current && p.id !== enrolment?.pathId)
  const [pathId, setPathId] = useState('')
  const [reason, setReason] = useState('')

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when a different learner is previewed
  useEffect(() => {
    setPathId(choices[0]?.id ?? '')
    setReason('')
  }, [preview?.learner.learnerCode, programme])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!enrolment) return
    override.mutate(
      { enrolmentId: enrolment.id, pathId, reason },
      {
        onSuccess: () => {
          toast.success('Path overridden. The reason is recorded in the audit trail.')
          onOpenChange(false)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <Dialog open={Boolean(preview)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">Override path</DialogTitle>
            <DialogDescription>
              {enrolment
                ? `${preview?.learner.fullName} is on ${enrolment.pathName ?? 'no path'}${enrolment.version ? ` (v${enrolment.version})` : ''}. An override replaces the rule result for this enrolment only.`
                : `${preview?.learner.fullName ?? 'This learner'} is not enrolled in Program ${programme}.`}
            </DialogDescription>
          </DialogHeader>
          {enrolment ? (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="override-path">New path</Label>
                <Select value={pathId} onValueChange={setPathId}>
                  <SelectTrigger id="override-path" className="w-full">
                    <SelectValue placeholder="Choose a path" />
                  </SelectTrigger>
                  <SelectContent>
                    {choices.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (v{p.current?.version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="override-reason">Reason</Label>
                <Textarea
                  id="override-reason"
                  required
                  minLength={5}
                  rows={3}
                  value={reason}
                  placeholder="Why this learner needs a different path"
                  onChange={(e) => setReason(e.target.value)}
                  aria-describedby="override-help"
                />
                <p id="override-help" className="text-xs text-muted-foreground">
                  Required. Shown on the enrolment and in the audit log.
                </p>
              </div>
            </>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {enrolment ? (
              <Button
                type="submit"
                disabled={override.isPending || !pathId || reason.trim().length < 5}
              >
                {override.isPending ? 'Saving' : 'Override path'}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
