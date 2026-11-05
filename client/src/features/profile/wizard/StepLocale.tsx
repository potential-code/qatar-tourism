import { Captions, Languages, MapPin, ShieldCheck } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { describedBy, Field } from '../components/Field'
import { FieldGroup } from '../components/FieldGroup'
import { OptionSelect } from '../components/OptionSelect'
import { ToggleRow } from '../components/ToggleRow'
import { useOptionLabels } from '../utils/options'
import type { StepProps } from './StepWork'

/** Step 2: where and how you learn (country, city, language, captions, accessibility). */
export function StepLocale({ draft, set, errors }: StepProps) {
  const { t } = useTranslation('learner')
  const labels = useOptionLabels()
  const id = useId()
  return (
    <div className="grid gap-6">
      <FieldGroup icon={MapPin} title={t('profile.onboarding.sections.location')}>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id={`${id}-country`} label={t('profile.locale.country')} error={errors.country}>
            <OptionSelect<string>
              id={`${id}-country`}
              value={draft.country}
              options={labels.countries}
              placeholder={t('profile.locale.countryPlaceholder')}
              onChange={(country) => set({ country })}
              error={errors.country}
            />
          </Field>
          <Field id={`${id}-city`} label={t('profile.locale.city')} optional>
            <Input
              id={`${id}-city`}
              value={draft.city}
              onChange={(event) => set({ city: event.target.value })}
              className="h-11 bg-white"
            />
          </Field>
        </div>
        <p className="flex items-start gap-2.5 rounded-lg bg-teal-mist/70 px-4 py-3 text-sm text-teal-deep">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t('profile.locale.noId')}
        </p>
      </FieldGroup>
      <FieldGroup
        icon={Languages}
        title={t('profile.onboarding.sections.language')}
        description={t('profile.onboarding.sections.languageDesc')}
      >
        <Field
          id={`${id}-language`}
          label={t('profile.locale.language')}
          hint={t('profile.locale.languageHint')}
          error={errors.preferredLanguage}
        >
          <OptionSelect<string>
            id={`${id}-language`}
            value={draft.preferredLanguage}
            options={labels.languages}
            placeholder={t('profile.locale.languagePlaceholder')}
            onChange={(preferredLanguage) => set({ preferredLanguage })}
            error={errors.preferredLanguage}
            hint
          />
        </Field>
        <ToggleRow
          id={`${id}-captions`}
          icon={Captions}
          label={t('profile.locale.captions')}
          hint={t('profile.locale.captionsHint')}
          checked={draft.captionsPreference}
          onChange={(captionsPreference) => set({ captionsPreference })}
        />
        <Field
          id={`${id}-access`}
          label={t('profile.locale.access')}
          optional
          hint={t('profile.locale.accessHint')}
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
      </FieldGroup>
    </div>
  )
}
