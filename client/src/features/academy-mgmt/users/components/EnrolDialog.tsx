import type { ProgrammeCode } from '@shared/constants'
import { PROGRAMME_LABELS, PROGRAMME_TITLES } from '@shared/schemas/admin-labels'
import { useState } from 'react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { useEnrol } from '../queries/users.queries'

/** Enrol in a programme; the path comes from the published assignment rules (brief §4, §14). */
export function EnrolDialog({
  userId,
  enrolled,
  open,
  onOpenChange,
}: {
  userId: string
  enrolled: readonly string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const enrol = useEnrol(userId)
  const available = (['A', 'B', 'C'] as const).filter((p) => !enrolled.includes(p))
  const [choice, setChoice] = useState<ProgrammeCode | null>(null)
  const selected = choice ?? available[0] ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            Enrol in a programme
          </DialogTitle>
          <DialogDescription>
            A learner can hold more than one enrolment. The learning path is assigned by the
            programme's published rules and shown with its reason.
          </DialogDescription>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This learner is already enrolled in every programme.
          </p>
        ) : (
          <RadioGroup
            value={selected ?? undefined}
            onValueChange={(v) => setChoice(v as ProgrammeCode)}
            className="grid gap-3"
          >
            {available.map((code) => (
              <label
                key={code}
                htmlFor={`enrol-${code}`}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors',
                  selected === code ? 'border-teal bg-teal-mist/60' : 'hover:bg-sand',
                )}
              >
                <RadioGroupItem id={`enrol-${code}`} value={code} />
                <span className="grid">
                  <span className="font-medium text-ink">{PROGRAMME_LABELS[code]}</span>
                  <span className="text-sm text-muted-foreground">
                    {PROGRAMME_TITLES[code]}
                    {code === 'C' ? ' (illustrative sample)' : ''}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected || enrol.isPending}
            onClick={async () => {
              if (!selected) return
              try {
                const result = await enrol.mutateAsync(selected)
                toast.success(`Enrolled in ${PROGRAMME_LABELS[selected]}`, {
                  description: result.reason,
                })
                onOpenChange(false)
              } catch (error) {
                toast.error(
                  error instanceof ApiError ? error.message : 'The enrolment could not be created',
                )
              }
            }}
          >
            {enrol.isPending ? 'Enrolling' : 'Enrol learner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
