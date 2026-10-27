import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { describedBy, Field } from '../components/Field'
import { OptionSelect } from '../components/OptionSelect'
import { COUNTRIES, LANGUAGES } from '../utils/options'
import type { StepProps } from './StepWork'

const pairs = (values: readonly string[]) => values.map((v) => [v, v] as const)

/** Step 2: where and how you learn (country, city, language, captions, accessibility). */
export function StepLocale({ draft, set, errors }: StepProps) {
  const id = useId()
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id={`${id}-country`} label="Country" error={errors.country}>
          <OptionSelect<string>
            id={`${id}-country`}
            value={draft.country}
            options={pairs(COUNTRIES)}
            placeholder="Choose a country"
            onChange={(country) => set({ country })}
            error={errors.country}
          />
        </Field>
        <Field id={`${id}-city`} label="City" optional>
          <Input
            id={`${id}-city`}
            value={draft.city}
            onChange={(event) => set({ city: event.target.value })}
            className="h-11 bg-white"
          />
        </Field>
      </div>
      <Field
        id={`${id}-language`}
        label="Preferred learning language"
        hint="English is the complete content set in this demonstration. We record your preference for future languages."
        error={errors.preferredLanguage}
      >
        <OptionSelect<string>
          id={`${id}-language`}
          value={draft.preferredLanguage}
          options={pairs(LANGUAGES)}
          placeholder="Choose a language"
          onChange={(preferredLanguage) => set({ preferredLanguage })}
          error={errors.preferredLanguage}
          hint
        />
      </Field>
      <div className="flex items-start justify-between gap-6 rounded-xl bg-white p-5 ring-1 ring-ink/5">
        <div className="grid gap-1">
          <label
            htmlFor={`${id}-captions`}
            className="flex items-baseline gap-2 font-medium text-sm"
          >
            Show captions and transcripts by default
            <span className="font-normal text-muted-foreground text-xs">Optional</span>
          </label>
          <p id={`${id}-captions-hint`} className="text-muted-foreground text-sm">
            Every video has captions and a transcript. This turns them on automatically.
          </p>
        </div>
        <Switch
          id={`${id}-captions`}
          checked={draft.captionsPreference}
          onCheckedChange={(captionsPreference) => set({ captionsPreference })}
          aria-describedby={`${id}-captions-hint`}
        />
      </div>
      <Field
        id={`${id}-access`}
        label="Accessibility support request"
        optional
        hint="Tell us about anything that would make sessions or content easier to use. Only Academy administrators see this."
        error={errors.accessibilityRequest}
      >
        <Textarea
          id={`${id}-access`}
          rows={3}
          maxLength={500}
          value={draft.accessibilityRequest}
          onChange={(event) => set({ accessibilityRequest: event.target.value })}
          className="bg-white"
          aria-describedby={describedBy(`${id}-access`, errors.accessibilityRequest, true)}
        />
      </Field>
      <p className="text-muted-foreground text-sm">
        We never ask for a passport, QID or other identity document.
      </p>
    </div>
  )
}
