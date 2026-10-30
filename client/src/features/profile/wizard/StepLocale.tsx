import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { describedBy, Field } from '../components/Field'
import { OptionSelect } from '../components/OptionSelect'
import { useOptionLabels } from '../utils/options'
import type { StepProps } from './StepWork'

/** Step 2: where and how you learn (country, city, language, captions, accessibility). */
export function StepLocale({ draft, set, errors }: StepProps) {
  const { t } = useTranslation('learner')
  const labels = useOptionLabels()
  const id = useId()
  return (
    <div className="grid gap-6">
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
      <div className="flex items-start justify-between gap-6 rounded-xl bg-white p-5 ring-1 ring-ink/5">
        <div className="grid gap-1">
          <label
            htmlFor={`${id}-captions`}
            className="flex items-baseline gap-2 font-medium text-sm"
          >
            {t('profile.locale.captions')}
            <span className="font-normal text-muted-foreground text-xs">
              {t('profile.common.optional')}
            </span>
          </label>
          <p id={`${id}-captions-hint`} className="text-muted-foreground text-sm">
            {t('profile.locale.captionsHint')}
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
      <p className="text-muted-foreground text-sm">{t('profile.locale.noId')}</p>
    </div>
  )
}
