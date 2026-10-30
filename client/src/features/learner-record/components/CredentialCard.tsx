import { Link } from '@tanstack/react-router'
import { Award, Download, Eye, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/features/academy-mgmt/hub/components/StatusPill'
import { cn } from '@/lib/utils'
import type { CredentialView } from '@/services/credentials/lifecycle'
import { useDownloadCredentialPdf } from '../queries/record.queries'
import { useRecordFormat } from '../utils/format'
import { LIFECYCLE_TONE } from '../utils/status'

/**
 * One credential in the wallet. Status is always a text label, never colour alone. Actions:
 * view, download the sample PDF, start or continue renewal (learner view only).
 */
export function CredentialCard({
  credential,
  cpdUnit,
  onRenew,
  readOnly = false,
}: {
  credential: CredentialView
  cpdUnit: string
  onRenew?: (code: string) => void
  readOnly?: boolean
}) {
  const { t } = useTranslation('record')
  const format = useRecordFormat()
  const download = useDownloadCredentialPdf()
  const { lifecycle } = credential
  const canRenew = lifecycle === 'expiring_soon' || lifecycle === 'expired'

  const verification =
    lifecycle === 'superseded'
      ? t('credentials.verification.superseded', { code: credential.supersededByCode ?? '—' })
      : t(`credentials.verification.${lifecycle}`)

  const facts: [string, string][] = [
    [
      t('credentials.fields.programme'),
      t('common.programmeTitle', {
        code: credential.programmeCode,
        title: credential.programmeTitle,
      }),
    ],
    [t('credentials.fields.credentialId'), credential.code],
    [t('credentials.fields.issued'), format.date(credential.issuedAt)],
    [t('credentials.fields.expires'), format.date(credential.expiresAt)],
    [
      t('credentials.fields.cpd'),
      t('cpd.amount', { value: format.number(credential.cpdHours), unit: cpdUnit }),
    ],
    [t('credentials.fields.verification'), verification],
  ]

  return (
    <article
      aria-label={t('credentials.cardLabel', { code: credential.code })}
      className={cn(
        'flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-xs',
        lifecycle === 'expiring_soon' && 'border-warning/40',
        (lifecycle === 'expired' || lifecycle === 'revoked') && 'border-destructive/30',
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-mist text-teal">
            <Award aria-hidden className="size-6" />
          </span>
          <div>
            <h3 className="font-display text-lg leading-tight text-ink">
              {credential.programmeTitle}
            </h3>
            {credential.priorCycle ? (
              <p className="text-xs text-muted-foreground">{t('credentials.priorCycle')}</p>
            ) : null}
          </div>
        </div>
        <StatusPill tone={LIFECYCLE_TONE[lifecycle]}>
          {t(`credentials.lifecycle.${lifecycle}`)}
        </StatusPill>
      </header>

      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label} className="grid gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-medium break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <p
        className={cn(
          'rounded-lg px-3 py-2 text-sm',
          lifecycle === 'expiring_soon' && 'bg-warning/10 text-ink',
          (lifecycle === 'expired' || lifecycle === 'revoked') && 'bg-destructive/10 text-ink',
          (lifecycle === 'active' || lifecycle === 'superseded') && 'bg-muted text-ink',
        )}
      >
        <span className="font-medium">{t('credentials.fields.nextAction')}: </span>
        {credential.nextAction === 'renewal_due' && credential.daysToExpiry !== null
          ? t('credentials.nextAction.renewal_due', { days: credential.daysToExpiry })
          : credential.nextAction === 'renewed'
            ? t('credentials.nextAction.renewed', { code: credential.supersededByCode ?? '—' })
            : t(`credentials.nextAction.${credential.nextAction}`)}
      </p>

      <footer className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          {readOnly ? (
            <Link to="/certificates/verify/$id" params={{ id: credential.code }} target="_blank">
              <Eye aria-hidden /> {t('credentials.actions.view')}
            </Link>
          ) : (
            <Link to="/learner/certificates/$code" params={{ code: credential.code }}>
              <Eye aria-hidden /> {t('credentials.actions.view')}
            </Link>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={download.isPending}
          onClick={() =>
            download.mutate(credential.code, {
              onError: () => toast.error(t('credentials.actions.downloadFailed')),
            })
          }
        >
          <Download aria-hidden />{' '}
          {download.isPending
            ? t('credentials.actions.preparing')
            : t('credentials.actions.download')}
        </Button>
        {!readOnly && canRenew && onRenew ? (
          <Button size="sm" onClick={() => onRenew(credential.code)}>
            <RefreshCw aria-hidden />{' '}
            {credential.renewal && !credential.renewal.completedAt
              ? t('credentials.actions.continueRenewal')
              : t('credentials.actions.startRenewal')}
          </Button>
        ) : null}
      </footer>
    </article>
  )
}
