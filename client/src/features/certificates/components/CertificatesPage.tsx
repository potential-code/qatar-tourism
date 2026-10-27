import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Award, ShieldCheck } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import { cardHover } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { StageMap } from '@/features/learning/components/StageMap'
import { useActiveProgramme } from '@/features/learning/hooks/useActiveProgramme'
import { journeyQuery } from '@/features/learning/queries/learning.queries'
import { PAGE_IMAGE } from '@/features/learning/utils/imagery'
import { qatarDate } from '@/lib/format/qatar-time'
import { myCertificatesQuery } from '../queries/certificates.queries'

/**
 * Certificates (brief §5 nav, §6). Only a certification-track enrolment (Program A) can hold
 * one; Program B and C never show a certificate.
 */
export function CertificatesPage() {
  const active = useActiveProgramme()
  const mine = useQuery(myCertificatesQuery())
  const hasA = active.enrolments.some((e) => e.programme === 'A')
  const journeyA = useQuery({ ...journeyQuery('A'), enabled: hasA })

  return (
    <div className="flex flex-col gap-8">
      <PhotoPanel
        src={PAGE_IMAGE.certificates.src}
        alt={PAGE_IMAGE.certificates.alt}
        fade="start"
        className="rounded-xl"
      >
        <div className="flex min-h-48 flex-col justify-end gap-2 p-6 md:p-10">
          <h1 className="font-display text-3xl font-light text-white md:text-5xl">Certificates</h1>
          <p className="max-w-xl text-white/85">
            Watermarked demonstration certificates for the Program A certification track. They are
            training records, not licences.
          </p>
        </div>
      </PhotoPanel>

      {active.isLoading || mine.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" aria-label="Loading certificates" />
      ) : active.error || mine.error ? (
        <LoadError error={active.error ?? mine.error} onRetry={() => void mine.refetch()} />
      ) : !hasA ? (
        <div className="rounded-xl border bg-white">
          <EmptyState
            icon={ShieldCheck}
            size="lg"
            title="No certification-track enrolment"
            description="Certificates appear only for a certification-track programme. Program B builds everyday skills and has no certificate. Program A, Tourism Service Professional, ends with a demonstration certificate."
            action={
              <Button asChild variant="outline">
                <Link to={'/programmes/A' as never}>About Program A</Link>
              </Button>
            }
          />
        </div>
      ) : (mine.data?.items.length ?? 0) > 0 ? (
        <Stagger className="grid gap-4 md:grid-cols-2">
          {mine.data?.items.map((cert) => (
            <StaggerItem key={cert.code}>
              <CertificateCard cert={cert} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <section className="flex flex-col gap-6 rounded-xl border bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-2xl font-normal text-ink">
              Your certificate is on its way
            </h2>
            <p className="max-w-[70ch] text-sm text-muted-foreground">
              The system checks every required condition and issues the demonstration certificate
              automatically: foundation quiz at least 80, an attended session scored at least 70, an
              approved assignment at least 70 and a final assessment at least 80.
            </p>
          </div>
          {journeyA.data ? (
            <StageMap gates={journeyA.data.gates} />
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
          <Button asChild className="self-start">
            <Link to="/learner/learning" search={{ programme: 'A' }}>
              Continue Program A <ArrowRight aria-hidden className="rtl:-scale-x-100" />
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
    status: string
    issuedAt: string
  }
}) {
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
          <p className="font-display text-xl text-ink">Program A: {cert.programmeTitle}</p>
          <p className="text-sm text-muted-foreground">
            {cert.code}, issued {qatarDate(cert.issuedAt)}
          </p>
          <p className="text-xs font-medium text-maroon">
            {cert.status === 'issued' ? 'Demonstration only' : 'Revoked'}
          </p>
        </div>
        <ArrowRight
          aria-hidden
          className="ms-auto size-5 shrink-0 text-teal transition-transform group-hover:translate-x-1 rtl:-scale-x-100"
        />
      </Link>
    </motion.div>
  )
}
