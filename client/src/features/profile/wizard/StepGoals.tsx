import type { LearningGoal } from '@shared/constants'
import { WEEKLY_MINUTES } from '@shared/constants'
import { BellRing, ChevronDown, Clock, Mail, Target } from 'lucide-react'
import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ChoiceCards, ChoiceChips } from '../components/ChoiceChips'
import { describedBy, Field } from '../components/Field'
import { FieldGroup } from '../components/FieldGroup'
import { ToggleRow } from '../components/ToggleRow'
import { GOAL_ICON } from '../utils/goal-icons'
import { GOAL_LABEL, useOptionLabels } from '../utils/options'
import type { StepProps } from './StepWork'

/** Step 3: goals, availability, optional contact and consent (brief §4). */
export function StepGoals({
  draft,
  set,
  errors,
  showConsent = true,
}: StepProps & { showConsent?: boolean }) {
  const { t } = useTranslation('learner')
  const labels = useOptionLabels()
  const id = useId()
  const goalOptions = useMemo(
    () => (Object.keys(GOAL_LABEL) as LearningGoal[]).map((k) => [k, labels.goal[k]] as const),
    [labels],
  )
  const weeklyOptions = WEEKLY_MINUTES.map(
    (m) => [m, String(m), t('profile.goals.minutesAWeek')] as const,
  )
  return (
    <div className="grid gap-6">
      <FieldGroup icon={Target} title={t('profile.onboarding.sections.goals')}>
        <div className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p id={`${id}-goals`} className="font-medium text-sm">
              {t('profile.goals.label')}{' '}
              <span className="font-normal text-muted-foreground">
                {t('profile.goals.chooseUpTo')}
              </span>
            </p>
            {errors.goals ? null : (
              <p
                aria-live="polite"
                className="flex items-center gap-1.5 text-muted-foreground text-sm"
              >
                <span aria-hidden className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        'size-2 rounded-full transition-colors duration-200',
                        i < draft.goals.length ? 'bg-teal' : 'bg-ink/15',
                      )}
                    />
                  ))}
                </span>
                {t('profile.goals.chosen', { n: draft.goals.length })}
              </p>
            )}
          </div>
          <ChoiceChips
            labelledBy={`${id}-goals`}
            options={goalOptions}
            value={draft.goals}
            max={3}
            onChange={(goals) => set({ goals })}
            icons={GOAL_ICON}
          />
          {errors.goals ? (
            <p role="alert" className="text-destructive text-sm">
              {errors.goals}
            </p>
          ) : null}
        </div>
      </FieldGroup>
      <FieldGroup icon={Clock} title={t('profile.onboarding.sections.time')}>
        <div className="grid gap-3">
          <p id={`${id}-weekly`} className="font-medium text-sm">
            {t('profile.goals.weekly')}
          </p>
          <ChoiceCards
            name={`${id}-weekly-choice`}
            labelledBy={`${id}-weekly`}
            options={weeklyOptions}
            value={draft.weeklyMinutes}
            onChange={(weeklyMinutes) => set({ weeklyMinutes })}
          />
          {errors.weeklyMinutes ? (
            <p role="alert" className="text-destructive text-sm">
              {errors.weeklyMinutes}
            </p>
          ) : null}
        </div>
      </FieldGroup>
      <FieldGroup icon={BellRing} title={t('profile.onboarding.sections.contact')}>
        <Field
          id={`${id}-mobile`}
          label={t('profile.goals.mobile')}
          optional
          hint={t('profile.goals.mobileHint')}
          error={errors.mobile}
        >
          <Input
            id={`${id}-mobile`}
            type="tel"
            dir="ltr"
            autoComplete="tel"
            value={draft.mobile}
            onChange={(event) => set({ mobile: event.target.value })}
            className="h-11 bg-white sm:max-w-xs"
            aria-describedby={describedBy(`${id}-mobile`, errors.mobile, true)}
          />
        </Field>
        <ToggleRow
          id={`${id}-comms`}
          icon={Mail}
          label={t('profile.goals.news')}
          hint={t('profile.goals.newsHint')}
          checked={draft.marketingOptIn}
          onChange={(marketingOptIn) => set({ marketingOptIn })}
        />
      </FieldGroup>
      {showConsent ? (
        <div
          className={cn(
            'grid gap-4 rounded-xl border p-5 transition-colors duration-200 sm:p-6',
            errors.acceptTerms
              ? 'border-destructive/40 bg-destructive/5'
              : draft.acceptTerms
                ? 'border-teal/30 bg-teal-mist/70'
                : 'border-teal/20 bg-teal-mist/40',
          )}
        >
          <Collapsible>
            <CollapsibleTrigger className="group inline-flex items-center gap-1 font-medium text-sm text-teal-deep">
              {t('profile.goals.readTerms')}
              <ChevronDown
                aria-hidden
                className="size-4 transition-transform group-data-[state=open]:rotate-180"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-2 pt-3 text-ink/80 text-sm leading-relaxed">
              <p>{t('profile.goals.terms1')}</p>
              <p>{t('profile.goals.terms2')}</p>
            </CollapsibleContent>
          </Collapsible>
          <div className="flex items-start gap-3 font-medium text-sm">
            <Checkbox
              id={`${id}-consent`}
              checked={draft.acceptTerms}
              onCheckedChange={(value) => set({ acceptTerms: value === true })}
              aria-invalid={errors.acceptTerms ? true : undefined}
              className="mt-0.5 bg-white"
            />
            <label htmlFor={`${id}-consent`}>{t('profile.goals.accept')}</label>
          </div>
          {errors.acceptTerms ? (
            <p role="alert" className="text-destructive text-sm">
              {errors.acceptTerms}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
