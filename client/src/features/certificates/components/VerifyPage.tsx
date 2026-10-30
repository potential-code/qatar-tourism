import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { BadgeCheck, CircleX, Clock, SearchX } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/brand/Logo'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { easeOut } from '@/components/motion/variants'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecordFormat } from '@/features/learner-record/utils/format'
import { LoadError } from '@/features/learning/components/LoadError'
import { PAGE_IMAGE } from '@/features/learning/utils/imagery'
import { verifyQuery } from '../queries/certificates.queries'

const CODE_PATTERN = /^QTA-DEMO-[A-Z]-\d{6}$/

/**
 * Public status page for a demo certificate (brief §6): the dummy verification link printed on
 * the sample PDF points here. Minimal fields only; it states expiry, replacement and revocation.
 */
export function VerifyPage({ code }: { code: string }) {
  const { t } = useTranslation('record')
  const format = useRecordFormat()
  const reduce = useReducedMotion()
  const valid = CODE_PATTERN.test(code)
  const result = useQuery({ ...verifyQuery(code), enabled: valid })
  const data = result.data?.found ? result.data : null

  const outcome = (() => {
    if (!data) return null
    switch (data.lifecycle) {
      case 'revoked':
        return {
          icon: CircleX,
          tone: 'text-destructive',
          title: t('certificate.verify.revokedTitle'),
          body: t('certificate.verify.revokedBody', { date: format.date(data.revokedAt) }),
        }
      case 'expired':
        return {
          icon: CircleX,
          tone: 'text-destructive',
          title: t('certificate.verify.expiredTitle'),
          body: t('certificate.verify.expiredBody', { date: format.date(data.expiresAt) }),
        }
      case 'superseded':
        return {
          icon: Clock,
          tone: 'text-muted-foreground',
          title: t('certificate.verify.supersededTitle'),
          body: t('certificate.verify.supersededBody'),
        }
      case 'expiring_soon':
        return {
          icon: Clock,
          tone: 'text-warning',
          title: t('certificate.verify.expiringTitle'),
          body: t('certificate.verify.expiringBody', { date: format.date(data.expiresAt) }),
        }
      default:
        return {
          icon: BadgeCheck,
          tone: 'text-teal',
          title: t('certificate.verify.validTitle'),
          body: t('certificate.verify.validBody'),
        }
    }
  })()

  return (
    <div className="min-h-[100dvh] bg-sand">
      <PhotoPanel src={PAGE_IMAGE.certificates.src} alt="" fade="full" className="min-h-[22rem]">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-8">
          <Link to="/" aria-label={t('certificate.verify.homeLabel')} className="h-11">
            <Logo variant="white" withAcademy className="h-full" />
          </Link>
          <h1 className="font-display text-4xl font-light text-white md:text-5xl">
            {t('certificate.verify.title')}
          </h1>
        </div>
      </PhotoPanel>
      <main className="relative z-10 mx-auto -mt-28 flex max-w-3xl flex-col gap-6 px-4 pb-16">
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="rounded-xl border bg-white p-6 shadow-lg md:p-10"
          aria-live="polite"
        >
          {!valid ? (
            <Outcome
              icon={SearchX}
              tone="text-muted-foreground"
              title={t('certificate.verify.notFormatTitle')}
              body={t('certificate.verify.notFormatBody', { code })}
            />
          ) : result.isLoading ? (
            <Skeleton className="h-40 w-full" aria-label={t('certificate.verify.checking')} />
          ) : result.error || !result.data ? (
            <LoadError error={result.error} onRetry={() => void result.refetch()} />
          ) : !data || !outcome ? (
            <Outcome
              icon={SearchX}
              tone="text-muted-foreground"
              title={t('certificate.verify.notFoundTitle')}
              body={t('certificate.verify.notFoundBody', { code })}
            />
          ) : (
            <div className="flex flex-col gap-6">
              <Outcome {...outcome} />
              <dl className="grid gap-4 border-t pt-6 sm:grid-cols-2">
                {[
                  [t('certificate.verify.fields.learner'), data.learnerName],
                  [
                    t('certificate.verify.fields.programme'),
                    t('certificate.canvas.programme', { title: data.programmeTitle }),
                  ],
                  [t('certificate.verify.fields.issued'), format.date(data.issuedAt)],
                  [t('certificate.verify.fields.expires'), format.date(data.expiresAt)],
                  [t('certificate.verify.fields.id'), data.code],
                  [
                    t('credentials.fields.verification'),
                    t(`credentials.lifecycle.${data.lifecycle}`),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs tracking-wider text-muted-foreground uppercase">
                      {label}
                    </dt>
                    <dd className="font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </motion.section>
        <p className="text-sm font-medium text-maroon">{t('certificate.verify.disclaimer')}</p>
        <DemoBadge />
      </main>
    </div>
  )
}

function Outcome({
  icon: Icon,
  tone,
  title,
  body,
}: {
  icon: typeof BadgeCheck
  tone: string
  title: string
  body: string
}) {
  return (
    <div className="flex items-start gap-4">
      <Icon aria-hidden className={`size-10 shrink-0 ${tone}`} />
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl text-ink">{title}</h2>
        <p className="text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}
