import { LICENCE_STATUSES, type LicenceStatus } from '@shared/constants'
import { SendHorizontal } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/features/academy-mgmt/hub/components/Field'
import { OptionSelect } from '@/features/academy-mgmt/hub/components/OptionSelect'
import { ReasonDialog } from '@/features/academy-mgmt/hub/components/ReasonDialog'
import { ApiError } from '@/lib/api-error'
import type { LicenceView } from '@/services/licence.service'
import { useRequestLicenceReview } from '../queries/record.queries'

const STATUS_OPTIONS = LICENCE_STATUSES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))

/**
 * Admin action (SPEC §7): LMS asks the CRM to review a learner's licence status after training.
 * The CRM stays the authority, so the request stays pending until the CRM acknowledges it.
 */
export function LicenceReviewAction({ userId, licence }: { userId: string; licence: LicenceView }) {
  const [open, setOpen] = useState(false)
  const [requested, setRequested] = useState<LicenceStatus>('active')
  const request = useRequestLicenceReview(userId)
  if (!licence.tracked) return null
  const pending = licence.pendingRequest !== null
  return (
    <>
      <Button variant="outline" disabled={pending} onClick={() => setOpen(true)}>
        <SendHorizontal aria-hidden /> Request licence review in CRM
      </Button>
      {pending ? (
        <p className="basis-full text-xs text-muted-foreground">
          Review request pending until the CRM acknowledges it. Training results do not change the
          licence.
        </p>
      ) : null}
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Request licence review"
        description="Sends a simulated review request to the CRM, which stays the authority for licence status. The request stays pending until the CRM acknowledges it. Passing training does not grant a licence."
        confirmLabel="Send request to CRM"
        pending={request.isPending}
        onConfirm={async (reason) => {
          try {
            await request.mutateAsync({ requestedStatus: requested, reason })
            toast.success('Review request sent (simulated)', {
              description: 'Pending until the CRM acknowledges it. Added to the CRM sync log.',
            })
            setOpen(false)
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : 'The request could not be sent')
          }
        }}
      >
        <Field id="licence-requested" label="Status to review">
          <OptionSelect
            id="licence-requested"
            value={requested}
            onChange={(v) => v && setRequested(v as LicenceStatus)}
            options={STATUS_OPTIONS}
          />
        </Field>
      </ReasonDialog>
    </>
  )
}
