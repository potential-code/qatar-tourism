import { profileCompleteInput } from '@shared/schemas'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Loader2, Save } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import { OnboardingLayout } from '../components/OnboardingLayout'
import { WhyWeAskPanel } from '../components/WhyWeAskPanel'
import { WizardProgress } from '../components/WizardProgress'
import { ownProfileQuery, useCompleteProfile, useSaveDraft } from '../queries/profile.queries'
import { draftFromProfile, draftPayload, fullPayload, type ProfileDraft } from '../utils/draft'
import { type FieldErrors, validateStep } from '../utils/validation'
import { StepGoals } from './StepGoals'
import { StepLocale } from './StepLocale'
import { StepWork } from './StepWork'
import { WHY_WE_ASK, WIZARD_STEPS } from './steps'

type Step = 1 | 2 | 3

/**
 * Three-step profile wizard (brief §4): inline validation, optional markers, "why we ask",
 * and a resumable draft saved on every step. Routing afterwards: Program B welcome, or the
 * Program A dashboard for a visitor who came from the Program A call to action.
 */
export function ProfileWizard() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const { data: profile, isPending, isError, refetch } = useQuery(ownProfileQuery())
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [errors, setErrors] = useState<FieldErrors>({})
  const headingRef = useRef<HTMLHeadingElement>(null)
  const saveDraft = useSaveDraft()
  const complete = useCompleteProfile()

  useEffect(() => {
    if (profile && !draft) {
      setDraft(draftFromProfile(profile))
      setStep(Math.min(3, Math.max(1, profile.wizardStep)) as Step)
    }
  }, [profile, draft])

  const set = (patch: Partial<ProfileDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current))
    // Clear the errors of the fields being edited: validation is inline, not nagging.
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch)) delete next[key as keyof FieldErrors]
      if ('organisationId' in patch || 'organisationIsOther' in patch) delete next.organisation
      return next
    })
  }

  function goTo(next: Step) {
    setStep(next)
    setErrors({})
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  async function next() {
    if (!draft) return
    const found = validateStep(step, draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    try {
      await saveDraft.mutateAsync(draftPayload(draft, (step + 1) as Step))
      goTo((step + 1) as Step)
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Your answers could not be saved. Try again.',
      )
    }
  }

  async function saveForLater() {
    if (!draft) return
    try {
      await saveDraft.mutateAsync(draftPayload(draft, step))
      toast.success('Draft saved. You can resume from this step at any time.')
      await navigate({ to: '/learner' as never })
    } catch {
      toast.error('Your draft could not be saved. Try again.')
    }
  }

  async function finish() {
    if (!draft) return
    // Revisit the first step with a problem, so every error is visible where it is fixed.
    for (const check of [1, 2, 3] as const) {
      const found = validateStep(check, draft)
      if (Object.keys(found).length > 0) {
        if (check !== step) goTo(check)
        setErrors(found)
        return
      }
    }
    const parsed = profileCompleteInput.safeParse(fullPayload(draft))
    if (!parsed.success) {
      toast.error('Some answers need attention before you finish.')
      return
    }
    try {
      const result = await complete.mutateAsync(parsed.data)
      toast.success('Profile complete.')
      await navigate({ to: result.next === 'A' ? ('/learner' as never) : '/onboarding/welcome' })
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Your profile could not be saved. Try again.',
      )
    }
  }

  const meta = WIZARD_STEPS[step - 1] ?? WIZARD_STEPS[0]
  const busy = saveDraft.isPending || complete.isPending

  if (isPending || (profile && !draft)) {
    return (
      <OnboardingLayout>
        <div className="grid gap-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-[420px] rounded-xl" />
        </div>
      </OnboardingLayout>
    )
  }
  if (isError || !draft || !profile) {
    return (
      <OnboardingLayout>
        <EmptyState
          variant="destructive"
          title="Your profile could not be loaded"
          description="Check your connection and try again."
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      </OnboardingLayout>
    )
  }
  if (profile.status === 'complete') {
    return (
      <OnboardingLayout>
        <EmptyState
          variant="success"
          title="Your profile is complete"
          description="You can change any answer later from the Profile page in your learner portal."
          action={
            <Button asChild>
              <Link to="/onboarding/welcome">Continue</Link>
            </Button>
          }
          secondaryAction={
            <Button asChild variant="outline">
              <Link to={'/learner/profile' as never}>Edit profile</Link>
            </Button>
          }
        />
      </OnboardingLayout>
    )
  }

  return (
    <OnboardingLayout aside={<WhyWeAskPanel step={step} name={profile.fullName} />}>
      <div className="grid gap-8">
        <div className="grid gap-5">
          <WizardProgress steps={WIZARD_STEPS.map((s) => s.title)} current={step} />
          <div className="grid gap-2">
            <p className="text-sm text-teal">
              Step {step} of 3, {profile.learnerCode}
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="font-display font-light text-4xl outline-none md:text-5xl"
            >
              {meta.title}
            </h1>
            <p className="text-muted-foreground">
              {WHY_WE_ASK} {meta.why}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 1 ? <StepWork draft={draft} set={set} errors={errors} /> : null}
            {step === 2 ? <StepLocale draft={draft} set={set} errors={errors} /> : null}
            {step === 3 ? <StepGoals draft={draft} set={set} errors={errors} /> : null}
          </motion.div>
        </AnimatePresence>

        {Object.keys(errors).length > 0 ? (
          <p role="alert" className="text-destructive text-sm">
            Some answers need attention before you continue.
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-ink/10 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={saveForLater} disabled={busy}>
            <Save aria-hidden />
            Save and finish later
          </Button>
          <div className="flex gap-3">
            {step > 1 ? (
              <Button
                variant="outline"
                size="lg"
                onClick={() => goTo((step - 1) as Step)}
                disabled={busy}
              >
                <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
                Back
              </Button>
            ) : null}
            {step < 3 ? (
              <Button size="lg" onClick={next} disabled={busy} className="flex-1 sm:flex-none">
                {saveDraft.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
                Continue
                <ArrowRight aria-hidden className="rtl:-scale-x-100" />
              </Button>
            ) : (
              <Button size="lg" onClick={finish} disabled={busy} className="flex-1 sm:flex-none">
                {complete.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
                Finish my profile
              </Button>
            )}
          </div>
        </div>
      </div>
    </OnboardingLayout>
  )
}
