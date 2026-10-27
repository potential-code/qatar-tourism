import type { ProgrammeCode } from '@shared/constants'
import { ROLE_HOME } from '@shared/roles'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Reveal } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ownProfileQuery } from '@/features/profile/queries/profile.queries'
import { PublicLayout } from '@/features/public-site/components/PublicLayout'
import { useSession } from '@/hooks/useSession'
import { ApiError } from '@/lib/api'
import { programmeSlug } from '../content'
import { myEnrolmentsQuery, programmeQuery, useEnrol } from '../queries/programmes.queries'
import { CertificationStatus } from './CertificationStatus'

const STATUS_LABEL: Record<string, string> = {
  not_started: 'not started',
  in_progress: 'in progress',
  awaiting_review: 'awaiting review',
  completed: 'completed',
}

/**
 * Request or confirm an enrolment (brief §3 routing: Program A CTA → register or sign in →
 * confirm A enrolment → Program A dashboard). Other enrolments are never touched.
 */
export function EnrolConfirmPage({ code }: { code: ProgrammeCode }) {
  const { session, role, isPending: sessionPending } = useSession()
  const programme = useQuery(programmeQuery(code))
  const enrolments = useQuery({ ...myEnrolmentsQuery(), enabled: role === 'learner' })
  const profile = useQuery({ ...ownProfileQuery(), enabled: role === 'learner' })
  const enrol = useEnrol()
  const navigate = useNavigate()
  const here = `/programmes/${programmeSlug(code)}/enrol`

  const existing = enrolments.data?.find((e) => e.programme === code)
  const others = enrolments.data?.filter((e) => e.programme !== code) ?? []

  async function confirm() {
    try {
      await enrol.mutateAsync(code)
      toast.success(`You are enrolled on Program ${code}.`)
      if (profile.data?.status === 'draft') {
        await navigate({
          to: '/onboarding',
          search: { programme: code === 'C' ? undefined : code },
        })
      } else {
        await navigate({ to: code === 'B' ? '/onboarding/welcome' : ('/learner' as never) })
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Enrolment failed. Please try again.')
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto grid max-w-[1100px] gap-10 px-4 pt-32 pb-24 md:px-8 md:pt-40 lg:grid-cols-[5fr_6fr]">
        <Reveal className="grid content-start gap-5">
          <p className="font-medium text-sm text-teal">Program {code}</p>
          <h1 className="font-display font-light text-4xl leading-[1.08] md:text-5xl">
            {programme.data?.title ?? <Skeleton className="h-12 w-72" />}
          </h1>
          <p className="text-muted-foreground leading-relaxed">{programme.data?.summary}</p>
          {programme.data ? (
            <p className="text-sm text-teal-deep">
              <CertificationStatus certified={programme.data.certificationEnabled} />
            </p>
          ) : null}
        </Reveal>

        <Reveal delay={0.1} className="rounded-xl bg-white p-6 ring-1 ring-ink/5 md:p-8">
          {sessionPending ? (
            <Skeleton className="h-48" />
          ) : code === 'C' ? (
            <div className="grid gap-4">
              <h2 className="font-display text-2xl">Program C is a sample</h2>
              <p className="text-muted-foreground text-sm">
                Program C is an illustrative sample programme and does not take enrolments.
              </p>
              <Button asChild variant="outline" className="w-fit">
                <Link to="/programmes/$code" params={{ code: 'c' }}>
                  Explore sample programme
                </Link>
              </Button>
            </div>
          ) : !session ? (
            <div className="grid gap-5">
              <h2 className="font-display text-2xl">Create an account or sign in to continue</h2>
              <p className="text-muted-foreground text-sm">
                After you sign in you will come straight back here to confirm your place on Program{' '}
                {code}. Anything you have already completed stays on your account.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild size="lg">
                  <Link to="/register" search={{ programme: code, redirect: here }}>
                    Create account
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/login" search={{ redirect: here }}>
                    Sign in
                  </Link>
                </Button>
              </div>
            </div>
          ) : role !== 'learner' ? (
            <div className="grid gap-4">
              <h2 className="font-display text-2xl">Enrolment is for learner accounts</h2>
              <p className="text-muted-foreground text-sm">
                You are signed in with a {role} account. Trainer and administrator accounts do not
                enrol on programmes.
              </p>
              <Button asChild variant="outline" className="w-fit">
                <Link to={(role ? ROLE_HOME[role] : '/') as never}>Go to my portal</Link>
              </Button>
            </div>
          ) : enrolments.isPending ? (
            <Skeleton className="h-48" />
          ) : existing ? (
            <div className="grid gap-4">
              <CheckCircle2 aria-hidden className="size-8 text-teal" />
              <h2 className="font-display text-2xl">You are already enrolled</h2>
              <p className="text-muted-foreground text-sm">
                Program {code} is {STATUS_LABEL[existing.status]} at {existing.progressPercent}{' '}
                percent.
              </p>
              <Button asChild className="w-fit">
                <Link to={'/learner/learning' as never}>Continue Program {code}</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              <h2 className="font-display text-2xl">Confirm your enrolment</h2>
              <ul className="grid gap-3 text-sm">
                <li className="flex gap-3">
                  <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
                  Demo approval rule: learner accounts are approved automatically. A production
                  Academy could require a manager or administrator approval here.
                </li>
                {others.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
                    Your Program {e.programme} progress stays as it is: {STATUS_LABEL[e.status]},{' '}
                    {e.progressPercent} percent.
                  </li>
                ))}
                {profile.data?.status === 'draft' ? (
                  <li className="flex gap-3">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
                    Next you will complete your profile, then the five-question baseline.
                  </li>
                ) : null}
              </ul>
              <Button size="lg" className="w-fit" onClick={confirm} disabled={enrol.isPending}>
                {enrol.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
                Confirm Program {code} enrolment
              </Button>
            </div>
          )}
        </Reveal>
      </div>
    </PublicLayout>
  )
}
