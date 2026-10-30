import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { Panel } from '@/features/academy-mgmt/hub/components/Panel'
import { ErrorPanel } from '@/features/academy-mgmt/hub/components/QueryStates'
import { learnerRecordQuery } from '../queries/record.queries'
import { useRecordFormat } from '../utils/format'
import { CpdLedger } from './CpdLedger'
import { CredentialCard } from './CredentialCard'
import { HistoryTable } from './HistoryTable'
import { LicencePanel } from './LicencePanel'

/**
 * Read-only "Learning record" for the admin learner detail: the same history, credentials, CPD,
 * external evidence and licence the learner sees. Admin screens stay English.
 */
export function AdminLearnerRecord({ userId }: { userId: string }) {
  const { t } = useTranslation('record')
  const format = useRecordFormat()
  const query = useQuery(learnerRecordQuery(userId))

  if (query.isPending) return <Skeleton className="h-64 rounded-xl" />
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => void query.refetch()} />
  const record = query.data
  const unit = t(`cpd.units.${record.cpd.unit}`)

  return (
    <Panel
      title={t('admin.title')}
      description={t('admin.description', {
        id: record.learner.displayId,
        crm: record.learner.crmId,
      })}
      bodyClassName="grid gap-8"
    >
      <section aria-label={t('tabs.history')} className="grid gap-2">
        <h3 className="font-display text-lg text-ink">{t('tabs.history')}</h3>
        {record.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('history.emptyBody')}</p>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <HistoryTable rows={record.history.slice(0, 12)} />
          </div>
        )}
      </section>
      <section aria-label={t('credentials.title')} className="grid gap-3">
        <h3 className="font-display text-lg text-ink">{t('credentials.title')}</h3>
        {record.credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('credentials.emptyBody')}</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {record.credentials.map((credential) => (
              <CredentialCard key={credential.id} credential={credential} cpdUnit={unit} readOnly />
            ))}
          </div>
        )}
      </section>
      <LicencePanel licence={record.licence} />
      <CpdLedger cpd={record.cpd} />
      <section aria-label={t('tabs.external')} className="grid gap-2">
        <h3 className="font-display text-lg text-ink">{t('tabs.external')}</h3>
        {record.external.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('external.emptyBody')}</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {record.external.map((item) => (
              <li key={item.id} className="rounded-lg border bg-white px-3 py-2">
                <span className="font-medium">{item.title}</span> · {item.issuer} ·{' '}
                {t(`external.status.${item.status}`)} · {t('external.claimed')}{' '}
                {format.number(item.claimedAmount)} {t(`cpd.units.${item.unit}`)}
                {item.recognisedAmount !== null
                  ? `, ${t('external.recognised')} ${format.number(item.recognisedAmount)}`
                  : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Panel>
  )
}
