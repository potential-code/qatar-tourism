import { profileUpdateInput } from '@shared/schemas/profile-account'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Info, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ProgressRing } from '@/components/data'
import { DemoBadge, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { LicencePanel } from '@/features/learner-record/components/LicencePanel'
import { myLicenceQuery } from '@/features/learner-record/queries/record.queries'
import { useSession } from '@/hooks/useSession'
import { tr } from '@/i18n/localised'
import { ApiError } from '@/lib/api-error'
import { ownProfileQuery, useUpdateProfile } from '../queries/profile.queries'
import { draftFromProfile, fullPayload, type ProfileDraft } from '../utils/draft'
import { type FieldErrors, validateStep } from '../utils/validation'
import { StepGoals } from '../wizard/StepGoals'
import { StepLocale } from '../wizard/StepLocale'
import { StepWork } from '../wizard/StepWork'
import { RevisionNotice } from './RevisionNotice'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-6 rounded-xl bg-white p-5 ring-1 ring-ink/5 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)] lg:gap-10">
      <div className="grid content-start gap-1.5">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

/** Learner Profile page (brief §4 "Profile updates and path assignment"). */
export function ProfilePage() {
  const { t, i18n } = useTranslation('learner')
  const { session } = useSession()
  const { data: profile, isPending, isError, refetch } = useQuery(ownProfileQuery())
  const { data: licence } = useQuery(myLicenceQuery())
  const update = useUpdateProfile()
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (profile && !draft) setDraft(draftFromProfile(profile))
  }, [profile, draft])

  const set = (patch: Partial<ProfileDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current))
    setErrors({})
  }

  async function save() {
    if (!draft) return
    const found = {
      ...validateStep(1, draft),
      ...validateStep(2, draft),
      ...validateStep(3, { ...draft, acceptTerms: true }),
    }
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error(t('profile.page.attention'))
      return
    }
    const parsed = profileUpdateInput.safeParse(fullPayload(draft))
    if (!parsed.success) return
    try {
      const result = await update.mutateAsync(parsed.data)
      toast.success(
        result.revisions.length > 0 ? t('profile.page.savedRevised') : t('profile.page.saved'),
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('profile.page.saveFailed'))
    }
  }

  if (isPending || (profile && !draft)) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }
  if (isError || !profile || !draft) {
    return (
      <EmptyState
        variant="destructive"
        title={t('profile.wizard.loadFailedTitle')}
        description={t('profile.wizard.loadFailedDesc')}
        action={<Button onClick={() => refetch()}>{t('profile.common.tryAgain')}</Button>}
      />
    )
  }

  return (
    <div className="grid gap-8 pb-24">
      <PageHeader
        image="profile"
        title={t('profile.page.title')}
        description={t('profile.page.description')}
        actions={<DemoBadge compact />}
      />
      <RevisionNotice revisions={profile.revisions} />
      {profile.status === 'draft' ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>{t('profile.page.draftNotice')}</p>
          <Button asChild size="sm">
            <Link to="/onboarding">{t('profile.page.completeProfile')}</Link>
          </Button>
        </div>
      ) : null}

      <section className="grid gap-6 rounded-xl bg-white p-5 ring-1 ring-ink/5 md:grid-cols-[auto_1fr] md:items-center md:p-8">
        <ProgressRing
          value={profile.completeness}
          size={112}
          strokeWidth={9}
          label={t('profile.page.complete')}
        />
        <div className="grid gap-4">
          <div className="grid gap-1">
            <p className="font-display text-3xl">{profile.fullName}</p>
            <p className="text-muted-foreground text-sm">
              {t('profile.page.learnerId', { code: profile.learnerCode })}
              {session?.user.email ? `, ${session.user.email}` : ''}
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {profile.enrolments.map((enrolment) => (
              <li key={enrolment.id} className="grid gap-0.5 rounded-lg bg-sand p-3.5 text-sm">
                <p className="font-medium">
                  {t('profile.page.programmeLine', {
                    programme: enrolment.programme,
                    title: tr(enrolment.programmeTitle, i18n.language),
                  })}
                </p>
                <p className="text-muted-foreground">
                  {t('profile.page.progressLine', {
                    status: t(`profile.status.${enrolment.status}`),
                    percent: enrolment.progressPercent,
                  })}
                  {enrolment.pathName
                    ? `${i18n.language === 'ar' ? '،' : ','} ${tr(enrolment.pathName, i18n.language)}`
                    : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {licence ? <LicencePanel licence={licence} /> : null}

      <p className="flex gap-2 text-muted-foreground text-sm">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
        {t('profile.page.pathChange')}
      </p>

      <Section title={t('profile.page.workTitle')} description={t('profile.page.workDesc')}>
        <StepWork draft={draft} set={set} errors={errors} />
      </Section>
      <Section title={t('profile.page.localeTitle')} description={t('profile.page.localeDesc')}>
        <StepLocale draft={draft} set={set} errors={errors} />
      </Section>
      <Section title={t('profile.page.goalsTitle')} description={t('profile.page.goalsDesc')}>
        <StepGoals draft={draft} set={set} errors={errors} showConsent={false} />
      </Section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <div className="flex items-center gap-3 rounded-full bg-white/90 p-2 shadow-lg ring-1 ring-ink/5 backdrop-blur-md">
          <Button
            variant="ghost"
            onClick={() => setDraft(draftFromProfile(profile))}
            disabled={update.isPending}
          >
            {t('profile.page.discard')}
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {t('profile.page.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
