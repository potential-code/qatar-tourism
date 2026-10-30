import { Award, Info } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/empty-state'
import type { LearnerRecord } from '@/services/credentials/learner-record.service'
import { CpdLedger } from './CpdLedger'
import { CredentialCard } from './CredentialCard'
import { LicencePanel } from './LicencePanel'
import { RenewalSheet } from './RenewalSheet'

/**
 * Certificates and CPD: the credential wallet (Active, Expiring soon, Expired, Revoked,
 * Superseded), the licence field kept apart, and the consolidated CPD ledger.
 */
export function CertificatesTab({ record }: { record: LearnerRecord }) {
  const { t } = useTranslation('record')
  const [renewing, setRenewing] = useState<string | null>(null)
  const unit = t(`cpd.units.${record.cpd.unit}`)
  const hasB = record.programmes.some((p) => !p.certificationEnabled)

  return (
    <div className="grid gap-8">
      <section aria-labelledby="wallet-title" className="grid gap-4">
        <h2 id="wallet-title" className="font-display text-2xl font-normal text-ink">
          {t('credentials.title')}
        </h2>
        {hasB ? (
          <p className="flex items-start gap-2 rounded-xl border border-teal/20 bg-teal-mist px-4 py-3 text-sm text-teal-deep">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t('credentials.programmeBNote')}
          </p>
        ) : null}
        {record.credentials.length === 0 ? (
          <div className="rounded-xl border bg-white">
            <EmptyState
              icon={Award}
              title={t('credentials.emptyTitle')}
              description={t('credentials.emptyBody')}
            />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {record.credentials.map((credential) => (
              <CredentialCard
                key={credential.id}
                credential={credential}
                cpdUnit={unit}
                onRenew={setRenewing}
              />
            ))}
          </div>
        )}
      </section>

      <LicencePanel licence={record.licence} />
      <CpdLedger cpd={record.cpd} />
      <RenewalSheet code={renewing} onClose={() => setRenewing(null)} />
    </div>
  )
}
