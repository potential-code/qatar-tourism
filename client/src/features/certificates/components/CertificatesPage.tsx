import type { CredentialLifecycle } from '@shared/constants/enums'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Award, ShieldCheck } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import { cardHover } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecordFormat } from '@/features/learner-record/utils/format'
import { LoadError } from '@/features/learning/components/LoadError'
import { StageMap } from '@/features/learning/components/StageMap'
import { useActiveProgramme } from '@/features/learning/hooks/useActiveProgramme'
import { journeyQuery } from '@/features/learning/queries/learning.queries'
import { PAGE_IMAGE } from '@/features/learning/utils/imagery'
import { myCertificatesQuery } from '../queries/certificates.queries'

/**
 * Certificates (brief §5 nav, §6). Only a certification-track enrolment (Program A) can hold
 * one; Program B and C never show a certificate. The page follows the active programme: with
 * Program B active it explains there is no certificate and offers the switch to A when held.
 * Renewal and the full wallet live in My Learning Record.
 */
export function CertificatesPage() {
  const { t } = useTranslation('record')
  const active = useActiveProgramme()
  const mine = useQuery(myCertificatesQuery())
  const hasA = active.enrolments.some((e) => e.programme === 'A')
  const showA = hasA && active.programme !== 'B'
  const journeyA = useQuery({ ...journeyQuery('A'), enabled: showA })

  return (
    <div className="flex flex-col gap-8">
      <PhotoPanel
        src={PAGE_IMAGE.certificates.src}
        alt={PAGE_IMAGE.certificates.alt}
        fade="start"
        className="rounded-xl"
      >
        <div className="flex min-h-48 flex-col justify-end gap-2 p-6 md:p-10">
          <h1 className="font-display text-3xl font-light text-white md:text-5xl">
            {t('certificate.list.title')}
          </h1>
          <p className="max-w-xl text-white/85">{t('certificate.list.description')}</p>
        </div>
      </PhotoPanel>

      {active.isLoading || mine.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" aria-label={t('common.loading')} />
      ) : active.error || mine.error ? (
        <LoadError error={active.error ?? mine.error} onRetry={() => void mine.refetch()} />
      ) : !showA ? (
        <div className="rounded-xl border bg-white">
          <EmptyState
            icon={ShieldCheck}
            size="lg"
            title={hasA ? t('certificate.list.noTrackTitleB') : t('certificate.list.noTrackTitle')}
            description={
              hasA ? t('certificate.list.noTrackBodyB') : t('certificate.list.noTrackBody')
            }
            action={
              hasA ? (
                <Button onClick={() => active.setProgramme('A')}>
                  {t('certificate.list.switchA')}
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link to={'/programmes/A' as never}>{t('certificate.list.aboutA')}</Link>
                </Button>
              )
            }
          />
        </div>
      ) : (mine.data?.items.length ?? 0) > 0 ? (
        <>
          <Stagger className="grid gap-4 md:grid-cols-2">
            {mine.data?.items.map((cert) => (
              <StaggerItem key={cert.code}>
                <CertificateCard cert={cert} />
              </StaggerItem>
            ))}
          </Stagger>
          <Button asChild variant="outline" className="self-start">
            <Link to="/learner/record">{t('certificate.list.openRecord')}</Link>
          </Button>
        </>
      ) : (
        <section className="flex flex-col gap-6 rounded-xl border bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-2xl font-normal text-ink">
              {t('certificate.list.onItsWayTitle')}
            </h2>
            <p className="max-w-[70ch] text-sm text-muted-foreground">
              {t('certificate.list.onItsWayBody')}
            </p>
          </div>
          {journeyA.data ? (
            <StageMap gates={journeyA.data.gates} />
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
          <Button asChild className="self-start">
            <Link to="/learner/learning" search={{ programme: 'A' }}>
              {t('certificate.list.continueA')}{' '}
              <ArrowRight aria-hidden className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </section>
      )}
    </div>
  )
}

function CertificateCard({
  cert,
}: {
  cert: {
    code: string
    learnerName: string
    programmeTitle: string
    lifecycle: CredentialLifecycle
    issuedAt: string
  }
}) {
  const { t } = useTranslation('record')
  const format = useRecordFormat()
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial="rest"
      whileHover={reduce ? undefined : 'hover'}
      variants={cardHover}
      className="rounded-xl"
    >
      <Link
        to="/learner/certificates/$code"
        params={{ code: cert.code }}
        className="group flex items-center gap-5 rounded-xl border bg-white p-6 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-teal-mist text-teal">
          <Award aria-hidden className="size-7" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display text-xl text-ink">
            {t('certificate.list.cardProgramme', { title: cert.programmeTitle })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('certificate.list.cardMeta', {
              code: cert.code,
              date: format.date(cert.issuedAt),
            })}
          </p>
          <p className="text-xs font-medium text-maroon">
            {t(`credentials.lifecycle.${cert.lifecycle}`)} · {t('certificate.list.demoOnly')}
          </p>
        </div>
        <ArrowRight
          aria-hidden
          className="ms-auto size-5 shrink-0 text-teal transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
        />
      </Link>
    </motion.div>
  )
}
