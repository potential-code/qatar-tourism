import { FileText, Plus, ShieldQuestion } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Textarea } from '@/components/ui/textarea'
import { StatusPill } from '@/features/academy-mgmt/hub/components/StatusPill'
import { ApiError } from '@/lib/api-error'
import type { LearnerRecord } from '@/services/credentials/learner-record.service'
import type { ExternalCertificateView } from '@/services/external-certificates.service'
import { useDownloadEvidence, useRespondToInfoRequest } from '../queries/record.queries'
import { useRecordFormat } from '../utils/format'
import { ExternalForm } from './ExternalForm'

const TONE = { pending: 'warn', verified: 'good', rejected: 'bad', info_requested: 'info' } as const

function ExternalCard({ item }: { item: ExternalCertificateView }) {
  const { t } = useTranslation('record')
  const format = useRecordFormat()
  const evidence = useDownloadEvidence()
  const respond = useRespondToInfoRequest()
  const [note, setNote] = useState('')
  const unit = t(`cpd.units.${item.unit}`)

  const next =
    item.status === 'pending'
      ? t('external.next.pending')
      : item.status === 'verified'
        ? t('external.next.verified', { value: format.number(item.recognisedAmount ?? 0), unit })
        : item.status === 'rejected'
          ? t('external.next.rejected')
          : t('external.next.info_requested')

  return (
    <article className="grid gap-3 rounded-xl border border-dashed bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg leading-tight text-ink">{item.title}</h3>
          <p className="text-sm text-muted-foreground">
            {item.issuer} · {item.externalRef}
          </p>
        </div>
        <StatusPill tone={TONE[item.status]}>{t(`external.status.${item.status}`)}</StatusPill>
      </header>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">{t('external.fields.issuedOn')}</dt>
          <dd className="font-medium">{format.date(item.issuedOn)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('external.fields.expiresOn')}</dt>
          <dd className="font-medium">{format.date(item.expiresOn)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('external.claimed')}</dt>
          <dd className="font-medium">
            {t('cpd.amount', { value: format.number(item.claimedAmount), unit })}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('external.recognised')}</dt>
          <dd className="font-medium">
            {item.recognisedAmount === null
              ? t('external.notYet')
              : t('cpd.amount', { value: format.number(item.recognisedAmount), unit })}
          </dd>
        </div>
        {item.requestCode ? (
          <div>
            <dt className="text-xs text-muted-foreground">{t('external.request')}</dt>
            <dd className="font-medium">{item.requestCode}</dd>
          </div>
        ) : null}
        {item.reviewedAt ? (
          <div>
            <dt className="text-xs text-muted-foreground">{t('external.reviewedOn')}</dt>
            <dd className="font-medium">{format.date(item.reviewedAt)}</dd>
          </div>
        ) : null}
      </dl>
      {item.reason ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="font-medium">{t('external.reason')}: </span>
          {item.reason}
        </p>
      ) : null}
      <p className="text-sm">
        <span className="font-medium">{t('credentials.fields.nextAction')}: </span>
        {next}
      </p>
      {item.status === 'info_requested' ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            respond.mutate(
              { id: item.id, note },
              {
                onSuccess: () => toast.success(t('external.infoSent')),
                onError: (error) =>
                  toast.error(
                    error instanceof ApiError ? error.message : t('external.submitFailed'),
                  ),
              },
            )
          }}
        >
          <label htmlFor={`info-${item.id}`} className="text-sm font-medium">
            {t('external.infoLabel')}
          </label>
          <Textarea
            id={`info-${item.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="rounded-lg"
          />
          <Button
            type="submit"
            size="sm"
            className="w-fit"
            disabled={respond.isPending || note.trim().length < 5}
          >
            {t('external.infoSend')}
          </Button>
        </form>
      ) : null}
      <footer className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={evidence.isPending}
          onClick={() =>
            evidence.mutate(item.id, { onError: () => toast.error(t('external.evidenceFailed')) })
          }
        >
          <FileText aria-hidden /> {t('external.viewEvidence')}
        </Button>
        {item.verificationUrl ? (
          <span className="text-xs text-muted-foreground" dir="ltr">
            {item.verificationUrl}
          </span>
        ) : null}
      </footer>
    </article>
  )
}

/** External Certificates: evidence earned elsewhere, always kept apart from Academy credentials. */
export function ExternalTab({ record }: { record: LearnerRecord }) {
  const { t } = useTranslation('record')
  const [open, setOpen] = useState(false)
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="font-display text-2xl font-normal text-ink">{t('external.title')}</h2>
          <p className="max-w-[70ch] text-sm text-muted-foreground">{t('external.description')}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus aria-hidden /> {t('external.add')}
        </Button>
      </div>
      <p className="flex items-start gap-2 rounded-xl border border-teal/20 bg-teal-mist px-4 py-3 text-sm text-teal-deep">
        <ShieldQuestion aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t('external.distinct')}
      </p>
      {record.external.length === 0 ? (
        <div className="rounded-xl border bg-white">
          <EmptyState
            icon={FileText}
            title={t('external.emptyTitle')}
            description={t('external.emptyBody')}
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {record.external.map((item) => (
            <ExternalCard key={item.id} item={item} />
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">
              {t('external.formTitle')}
            </DialogTitle>
            <DialogDescription>{t('external.formDescription')}</DialogDescription>
          </DialogHeader>
          <ExternalForm today={record.today} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
