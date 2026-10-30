import type { CredentialLifecycle } from '@shared/constants/enums'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LIFECYCLE_TONE } from '@/features/learner-record/utils/status'
import { ApiError } from '@/lib/api-error'
import type { ValidityFilter } from '@/services/cpd.service'
import type { CredentialView } from '@/services/credentials/lifecycle'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { Panel } from '../../hub/components/Panel'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { ReasonDialog } from '../../hub/components/ReasonDialog'
import { StatusPill } from '../../hub/components/StatusPill'
import { qDate } from '../../hub/utils/format'
import {
  issuedQuery,
  useReissueCredential,
  useRevokeCredential,
} from '../queries/certificates-admin.queries'

export const LIFECYCLE_LABEL: Record<CredentialLifecycle, string> = {
  active: 'Active',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
  revoked: 'Revoked',
  superseded: 'Superseded',
}

const PAGE = 25

export function IssuedTab() {
  const [validity, setValidity] = useState<ValidityFilter>('all')
  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [dialog, setDialog] = useState<{ kind: 'revoke' | 'reissue'; code: string } | null>(null)
  const query = useQuery(issuedQuery({ validity, search }))
  const revoke = useRevokeCredential()
  const reissue = useReissueCredential()

  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => void query.refetch()} />
  const counts = query.data?.counts
  const rows = query.data?.items ?? []
  const options = (['all', ...Object.keys(LIFECYCLE_LABEL)] as ValidityFilter[]).map((v) => ({
    value: v,
    label: `${v === 'all' ? 'All credentials' : LIFECYCLE_LABEL[v]}${counts ? ` (${counts[v]})` : ''}`,
  }))

  const act = async (reason: string) => {
    if (!dialog) return
    try {
      if (dialog.kind === 'revoke') await revoke.mutateAsync({ code: dialog.code, reason })
      else await reissue.mutateAsync({ code: dialog.code, reason })
      toast.success(
        dialog.kind === 'revoke'
          ? `${dialog.code} revoked. The learner keeps the record; the CRM event log was updated.`
          : `${dialog.code} reissued as a new credential.`,
      )
      setDialog(null)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'The change could not be saved')
    }
  }

  return (
    <Panel
      title="Issued credentials"
      description="Every Program A credential with its validity today. Status is derived from expiry and the demo clock."
      bodyClassName="grid gap-4 p-0"
    >
      <div className="flex flex-wrap items-end gap-3 px-6 pt-5">
        <div className="grid gap-1.5">
          <label htmlFor="issued-validity" className="text-sm font-medium">
            Validity
          </label>
          <OptionSelect
            id="issued-validity"
            value={validity}
            onChange={(v) => {
              setValidity((v ?? 'all') as ValidityFilter)
              setShown(PAGE)
            }}
            options={options}
            className="h-10 w-56 rounded-lg bg-white"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="issued-search" className="text-sm font-medium">
            Search
          </label>
          <Input
            id="issued-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setShown(PAGE)
            }}
            placeholder="Learner, LRN-0042 or credential ID"
            className="w-72 max-w-full"
          />
        </div>
        <p className="ms-auto text-sm text-muted-foreground" role="status">
          {rows.length} credential{rows.length === 1 ? '' : 's'}
        </p>
      </div>
      {query.isPending ? (
        <TableSkeleton cols={7} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Credential</TableHead>
              <TableHead>Learner</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Links</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No credentials match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.slice(0, shown).map((c) => <IssuedRow key={c.id} c={c} onAction={setDialog} />)
            )}
          </TableBody>
        </Table>
      )}
      {rows.length > shown ? (
        <div className="px-6 pb-5">
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
            Show more ({rows.length - shown} remaining)
          </Button>
        </div>
      ) : null}
      <ReasonDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog?.kind === 'revoke' ? 'Revoke credential' : 'Reissue credential'}
        description={
          dialog?.kind === 'revoke'
            ? `Revoking ${dialog.code} marks it Revoked. The record is kept.`
            : `Reissuing ${dialog?.code} creates a new credential with a fresh validity period.`
        }
        confirmLabel={dialog?.kind === 'revoke' ? 'Revoke' : 'Reissue'}
        destructive={dialog?.kind === 'revoke'}
        pending={revoke.isPending || reissue.isPending}
        onConfirm={(reason) => void act(reason)}
      />
    </Panel>
  )
}

function IssuedRow({
  c,
  onAction,
}: {
  c: CredentialView
  onAction: (action: { kind: 'revoke' | 'reissue'; code: string }) => void
}) {
  return (
    <TableRow>
      <TableCell className="font-medium whitespace-nowrap">
        {c.code}
        {c.priorCycle ? (
          <span className="block text-xs font-normal text-muted-foreground">Prior cycle</span>
        ) : null}
      </TableCell>
      <TableCell className="min-w-44">
        {c.learnerName}
        <span className="block text-xs text-muted-foreground">{c.learnerDisplayId}</span>
      </TableCell>
      <TableCell className="whitespace-nowrap">{qDate(c.issuedAt)}</TableCell>
      <TableCell className="whitespace-nowrap">
        {qDate(c.expiresAt)}
        {c.daysToExpiry !== null &&
        (c.lifecycle === 'expiring_soon' || c.lifecycle === 'expired') ? (
          <span className="block text-xs text-muted-foreground">
            {c.daysToExpiry >= 0
              ? `${c.daysToExpiry} days left`
              : `${Math.abs(c.daysToExpiry)} days ago`}
          </span>
        ) : null}
      </TableCell>
      <TableCell>
        <StatusPill tone={LIFECYCLE_TONE[c.lifecycle]}>{LIFECYCLE_LABEL[c.lifecycle]}</StatusPill>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {c.supersedesCode ? <span className="block">Renews {c.supersedesCode}</span> : null}
        {c.supersededByCode ? (
          <span className="block">Replaced by {c.supersededByCode}</span>
        ) : null}
        {c.revokeReason ? <span className="block max-w-48">{c.revokeReason}</span> : null}
      </TableCell>
      <TableCell className="text-end whitespace-nowrap">
        {c.lifecycle === 'revoked' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction({ kind: 'reissue', code: c.code })}
          >
            Reissue
          </Button>
        ) : c.lifecycle !== 'superseded' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction({ kind: 'revoke', code: c.code })}
          >
            Revoke
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  )
}
