import { BadgeInfo } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { StatusPill } from '@/features/academy-mgmt/hub/components/StatusPill'
import type { LicenceView } from '@/services/licence.service'
import { useRecordFormat } from '../utils/format'

const TONE = { active: 'good', expired: 'bad', suspended: 'bad', pending: 'warn' } as const

/**
 * Licence status is its own field (source: CRM, illustrative). Nothing about a certificate or an
 * exam result feeds it, and the screen says so.
 */
export function LicencePanel({ licence }: { licence: LicenceView }) {
  const { t } = useTranslation('record')
  const format = useRecordFormat()
  return (
    <section
      aria-labelledby="licence-title"
      className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-white p-5"
    >
      <div className="flex gap-3">
        <BadgeInfo aria-hidden className="mt-0.5 size-5 shrink-0 text-teal" />
        <div className="grid gap-1">
          <h2 id="licence-title" className="font-display text-lg text-ink">
            {t('licence.title')}
          </h2>
          <p className="max-w-[65ch] text-sm text-muted-foreground">{t('licence.note')}</p>
          {licence.pendingRequest ? (
            <p className="text-sm">
              {t('licence.pendingRequest', {
                status: t(`licence.status.${licence.pendingRequest.requestedStatus}`),
                date: format.date(licence.pendingRequest.requestedAt),
              })}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {licence.tracked && licence.status ? (
          <StatusPill tone={TONE[licence.status]}>
            {t(`licence.status.${licence.status}`)}
          </StatusPill>
        ) : (
          <StatusPill tone="muted">{t('licence.notTracked')}</StatusPill>
        )}
        <SimulatedTag label={t('licence.source')} />
      </div>
    </section>
  )
}
