import { LockKeyhole, LockKeyholeOpen } from 'lucide-react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import { Panel } from '../../hub/components/Panel'
import { StatusPill, type Tone } from '../../hub/components/StatusPill'
import { qDateTime } from '../../hub/utils/format'

const LABEL: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'good' },
  locked: { label: 'Locked', tone: 'warn' },
  disabled: { label: 'Disabled', tone: 'bad' },
}

/**
 * Account status (SPEC §5): Active, Locked or Disabled. Kept apart from programme approval,
 * certificate validity and licence status. Lock and Unlock are for administrators; this page is
 * not reachable by trainers, and the service refuses them too. A disabled (suspended) account is
 * reactivated from the header, not here.
 */
export function AccountStatusPanel({
  status,
  lockReason,
  lockedAt,
  lockedBy,
  onToggle,
}: {
  status: string
  lockReason: string | null
  lockedAt: string | null
  lockedBy: string | null
  onToggle: () => void
}) {
  const state = LABEL[status] ?? { label: status, tone: 'neutral' as const }
  const locked = status === 'locked'
  return (
    <Panel
      title="Account status"
      description="Separate from programme approval, certificate validity and licence status."
      action={<SimulatedTag label="Lock is simulated" className="whitespace-nowrap" />}
    >
      <div className="grid gap-3 text-sm">
        <p className="flex items-center gap-2">
          <StatusPill tone={state.tone}>{state.label}</StatusPill>
          <span className="text-muted-foreground">
            {status === 'active'
              ? 'The learner can sign in.'
              : locked
                ? 'Sign-in is blocked. History, results and credentials are kept.'
                : 'The account is disabled. Reactivate it from the page header.'}
          </span>
        </p>
        {locked ? (
          <p className="rounded-lg bg-sand px-3 py-2 text-ink-soft">
            <span className="font-medium">Reason:</span> {lockReason ?? 'Not recorded'}
            <span className="block text-xs text-muted-foreground">
              Locked {qDateTime(lockedAt)}
              {lockedBy ? ` by ${lockedBy}` : ''}
            </span>
          </p>
        ) : null}
        {status !== 'disabled' ? (
          <div>
            <Button variant={locked ? 'default' : 'outline'} onClick={onToggle}>
              {locked ? <LockKeyholeOpen /> : <LockKeyhole />}
              {locked ? 'Unlock account' : 'Lock account'}
            </Button>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}
