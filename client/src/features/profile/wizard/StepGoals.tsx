import type { LearningGoal } from '@shared/constants'
import { WEEKLY_MINUTES } from '@shared/constants'
import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ChoiceCards, ChoiceChips } from '../components/ChoiceChips'
import { describedBy, Field } from '../components/Field'
import { GOAL_LABEL } from '../utils/options'
import type { StepProps } from './StepWork'

const goalOptions = Object.entries(GOAL_LABEL) as [LearningGoal, string][]
const weeklyOptions = WEEKLY_MINUTES.map((m) => [m, String(m), 'minutes a week'] as const)

/** Step 3: goals, availability, optional contact and consent (brief §4). */
export function StepGoals({
  draft,
  set,
  errors,
  showConsent = true,
}: StepProps & { showConsent?: boolean }) {
  const id = useId()
  return (
    <div className="grid gap-7">
      <div className="grid gap-3">
        <p id={`${id}-goals`} className="font-medium text-sm">
          Your goals <span className="font-normal text-muted-foreground">(choose up to three)</span>
        </p>
        <ChoiceChips
          labelledBy={`${id}-goals`}
          options={goalOptions}
          value={draft.goals}
          max={3}
          onChange={(goals) => set({ goals })}
        />
        {errors.goals ? (
          <p role="alert" className="text-destructive text-sm">
            {errors.goals}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">{draft.goals.length} of 3 chosen</p>
        )}
      </div>
      <div className="grid gap-3">
        <p id={`${id}-weekly`} className="font-medium text-sm">
          Weekly learning time
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
      <Field
        id={`${id}-mobile`}
        label="Mobile number"
        optional
        hint="Never shown to trainers by default. Essential session notices still arrive in the app."
        error={errors.mobile}
      >
        <Input
          id={`${id}-mobile`}
          type="tel"
          autoComplete="tel"
          value={draft.mobile}
          onChange={(event) => set({ mobile: event.target.value })}
          className="h-11 bg-white sm:max-w-xs"
          aria-describedby={describedBy(`${id}-mobile`, errors.mobile, true)}
        />
      </Field>
      <div className="flex items-start justify-between gap-6 rounded-xl bg-white p-5 ring-1 ring-ink/5">
        <div className="grid gap-1">
          <label htmlFor={`${id}-comms`} className="flex items-baseline gap-2 font-medium text-sm">
            Academy news and programme updates
            <span className="font-normal text-muted-foreground text-xs">Optional</span>
          </label>
          <p className="text-muted-foreground text-sm">
            Separate from essential session notices, which you always receive.
          </p>
        </div>
        <Switch
          id={`${id}-comms`}
          checked={draft.marketingOptIn}
          onCheckedChange={(marketingOptIn) => set({ marketingOptIn })}
        />
      </div>
      {showConsent ? (
        <div className="grid gap-3 rounded-xl border border-teal/20 bg-teal-mist/60 p-5">
          <Collapsible>
            <CollapsibleTrigger className="group inline-flex items-center gap-1 font-medium text-sm text-teal-deep">
              Read the demo terms and privacy information
              <ChevronDown
                aria-hidden
                className="size-4 transition-transform group-data-[state=open]:rotate-180"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-2 pt-3 text-ink/80 text-sm leading-relaxed">
              <p>
                This is a demonstration environment. All learner and training data is fictional, and
                fictional records are deleted at the end of the trial.
              </p>
              <p>
                Your profile is used to recommend learning. Trainers see your learner ID and display
                name only. Administrators see profile fields for reporting. No identity documents
                are collected.
              </p>
            </CollapsibleContent>
          </Collapsible>
          <div className="flex items-start gap-3 text-sm">
            <Checkbox
              id={`${id}-consent`}
              checked={draft.acceptTerms}
              onCheckedChange={(value) => set({ acceptTerms: value === true })}
              aria-invalid={errors.acceptTerms ? true : undefined}
              className="mt-0.5 bg-white"
            />
            <label htmlFor={`${id}-consent`}>
              I accept the demo terms and privacy information.
            </label>
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
