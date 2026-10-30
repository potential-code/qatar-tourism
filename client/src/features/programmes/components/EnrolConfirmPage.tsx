import type { ProgrammeCode } from '@shared/constants'
import { ROLE_HOME } from '@shared/roles'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Reveal } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ownProfileQuery } from '@/features/profile/queries/profile.queries'
import { PublicLayout } from '@/features/public-site/components/PublicLayout'
import { useSession } from '@/hooks/useSession'
import { ApiError } from '@/lib/api-error'
import { programmeSlug } from '../content'
import { myEnrolmentsQuery, programmeQuery, useEnrol } from '../queries/programmes.queries'
import { programmeName, programmeText } from '../utils/copy'
import { CertificationStatus } from './CertificationStatus'

/**
 * Request or confirm an enrolment (brief §3 routing: Program A CTA → register or sign in →
 * confirm A enrolment → Program A dashboard). Other enrolments are never touched.
 */
export function EnrolConfirmPage({ code }: { code: ProgrammeCode }) {
  const { t } = useTranslation('public')
  const status = (value: string) =>
    String(t(`enrol.status.${value}` as 'enrol.status.completed', { defaultValue: value }))
  const name = programmeName(t, code)
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
      toast.success(t('enrol.success', { programme: name }))
      if (profile.data?.status === 'draft') {
        await navigate({
          to: '/onboarding',
          search: { programme: code === 'C' ? undefined : code },
        })
      } else {
        await navigate({ to: code === 'B' ? '/onboarding/welcome' : ('/learner' as never) })
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('enrol.failed'))
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto grid max-w-[1100px] gap-10 px-4 pt-32 pb-24 md:px-8 md:pt-40 lg:grid-cols-[5fr_6fr]">
        <Reveal className="grid content-start gap-5">
          <p className="font-medium text-sm text-teal">{name}</p>
          <h1 className="font-display font-light text-4xl leading-[1.08] rtl:leading-[1.4] md:text-5xl">
            {programme.data ? programmeText(t, code, 'title') : <Skeleton className="h-12 w-72" />}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {programme.data ? programmeText(t, code, 'summary') : null}
          </p>
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
              <h2 className="font-display text-2xl">{t('enrol.cSampleTitle')}</h2>
              <p className="text-muted-foreground text-sm">{t('enrol.cSampleBody')}</p>
              <Button asChild variant="outline" className="w-fit">
                <Link to="/programmes/$code" params={{ code: 'c' }}>
                  {t('enrol.cExplore')}
                </Link>
              </Button>
            </div>
          ) : !session ? (
            <div className="grid gap-5">
              <h2 className="font-display text-2xl">{t('enrol.signInTitle')}</h2>
              <p className="text-muted-foreground text-sm">
                {t('enrol.signInBody', { programme: name })}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild size="lg">
                  <Link to="/register" search={{ programme: code, redirect: here }}>
                    {t('nav.createAccount')}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/login" search={{ redirect: here }}>
                    {t('nav.signIn')}
                  </Link>
                </Button>
              </div>
            </div>
          ) : role !== 'learner' ? (
            <div className="grid gap-4">
              <h2 className="font-display text-2xl">{t('enrol.learnerOnlyTitle')}</h2>
              <p className="text-muted-foreground text-sm">
                {t('enrol.learnerOnlyBody', {
                  role: t(`enrol.role.${role}` as 'enrol.role.learner', { defaultValue: role }),
                })}
              </p>
              <Button asChild variant="outline" className="w-fit">
                <Link to={(role ? ROLE_HOME[role] : '/') as never}>{t('nav.myPortal')}</Link>
              </Button>
            </div>
          ) : enrolments.isPending ? (
            <Skeleton className="h-48" />
          ) : existing ? (
            <div className="grid gap-4">
              <CheckCircle2 aria-hidden className="size-8 text-teal" />
              <h2 className="font-display text-2xl">{t('enrol.already')}</h2>
              <p className="text-muted-foreground text-sm">
                {t('enrol.alreadyBody', {
                  programme: name,
                  status: status(existing.status),
                  percent: existing.progressPercent,
                })}
              </p>
              <Button asChild className="w-fit">
                <Link to={'/learner/learning' as never}>
                  {t('programme.continue', { programme: name })}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              <h2 className="font-display text-2xl">{t('enrol.confirmTitle')}</h2>
              <ul className="grid gap-3 text-sm">
                <li className="flex gap-3">
                  <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
                  {t('enrol.approval')}
                </li>
                {others.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
                    {t('enrol.otherProgress', {
                      programme: programmeName(t, e.programme),
                      status: status(e.status),
                      percent: e.progressPercent,
                    })}
                  </li>
                ))}
                {profile.data?.status === 'draft' ? (
                  <li className="flex gap-3">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
                    {t('enrol.nextProfile')}
                  </li>
                ) : null}
              </ul>
              <Button size="lg" className="w-fit" onClick={confirm} disabled={enrol.isPending}>
                {enrol.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
                {t('enrol.confirm', { programme: name })}
              </Button>
            </div>
          )}
        </Reveal>
      </div>
    </PublicLayout>
  )
}
