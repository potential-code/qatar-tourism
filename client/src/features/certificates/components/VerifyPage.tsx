import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { BadgeCheck, CircleX, SearchX } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Logo } from '@/components/brand/Logo'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { easeOut } from '@/components/motion/variants'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { qatarDate } from '@/features/learning/utils/format'
import { PAGE_IMAGE } from '@/features/learning/utils/imagery'
import { verifyQuery } from '../queries/certificates.queries'

const CODE_PATTERN = /^QTA-DEMO-[A-Z]-\d{6}$/

/** Public verification of a demo certificate record (brief §6). Minimal fields only. */
export function VerifyPage({ code }: { code: string }) {
  const reduce = useReducedMotion()
  const valid = CODE_PATTERN.test(code)
  const result = useQuery({ ...verifyQuery(code), enabled: valid })

  return (
    <div className="min-h-[100dvh] bg-sand">
      <PhotoPanel src={PAGE_IMAGE.certificates.src} alt="" fade="full" className="min-h-[22rem]">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-8">
          <Link to="/" aria-label="Qatar Tourism Academy home" className="h-11">
            <Logo variant="white" withAcademy className="h-full" />
          </Link>
          <h1 className="font-display text-4xl font-light text-white md:text-5xl">
            Certificate verification
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
              title="Not a demo certificate ID"
              body={`"${code}" is not in the QTA-DEMO format.`}
            />
          ) : result.isLoading ? (
            <Skeleton className="h-40 w-full" aria-label="Checking the record" />
          ) : result.error || !result.data ? (
            <LoadError error={result.error} onRetry={() => void result.refetch()} />
          ) : !result.data.found ? (
            <Outcome
              icon={SearchX}
              tone="text-muted-foreground"
              title="No record found"
              body={`There is no demonstration certificate with ID ${code}.`}
            />
          ) : (
            <div className="flex flex-col gap-6">
              <Outcome
                icon={result.data.status === 'issued' ? BadgeCheck : CircleX}
                tone={result.data.status === 'issued' ? 'text-teal' : 'text-destructive'}
                title={
                  result.data.status === 'issued'
                    ? 'Valid demonstration record'
                    : 'This certificate was revoked'
                }
                body={
                  result.data.status === 'issued'
                    ? 'This record exists in the Qatar Tourism Academy demonstration environment.'
                    : `Revoked on ${qatarDate(result.data.revokedAt, 'long')}.`
                }
              />
              <dl className="grid gap-4 border-t pt-6 sm:grid-cols-2">
                {[
                  ['Learner', result.data.learnerName],
                  ['Programme', `Program A: ${result.data.programmeTitle}`],
                  ['Issued', qatarDate(result.data.issuedAt, 'long')],
                  ['Demo certificate ID', result.data.code],
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
        <p className="text-sm font-medium text-maroon">
          DEMONSTRATION ONLY. A training completion record with fictional data. It is not a guide
          licence, permit or official qualification.
        </p>
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
