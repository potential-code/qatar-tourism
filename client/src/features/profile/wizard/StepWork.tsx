import type { ExperienceBand, JobFunction, OrganisationType, Seniority } from '@shared/constants'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { describedBy, Field } from '../components/Field'
import { OptionSelect } from '../components/OptionSelect'
import { OrganisationPicker } from '../components/OrganisationPicker'
import type { ProfileDraft } from '../utils/draft'
import { JOB_TITLE_SUGGESTIONS, useOptionLabels } from '../utils/options'
import type { FieldErrors } from '../utils/validation'

export type StepProps = {
  draft: ProfileDraft
  set: (patch: Partial<ProfileDraft>) => void
  errors: FieldErrors
}

const entries = <K extends string>(labels: Record<K, string>) =>
  Object.entries(labels) as [K, string][]

/** Step 1: work (brief §4 organisation, type, job title and function, seniority, experience). */
export function StepWork({ draft, set, errors }: StepProps) {
  const { t } = useTranslation('learner')
  const labels = useOptionLabels()
  const id = useId()
  const isOther = draft.organisationIsOther
  const typeLocked = !isOther && Boolean(draft.organisationId)
  return (
    <div className="grid gap-6">
      <Field
        id={`${id}-org`}
        label={t('profile.work.organisation')}
        hint={t('profile.work.organisationHint')}
        error={errors.organisation}
      >
        <OrganisationPicker
          // Remount when the organisation changes from outside (sample answers) so it closes.
          key={draft.organisationId ?? (isOther ? 'other' : 'none')}
          id={`${id}-org`}
          selectedName={draft.organisationName}
          isOther={isOther}
          error={errors.organisation}
          onChoose={(choice) =>
            choice.kind === 'existing'
              ? set({
                  organisationId: choice.id,
                  organisationName: choice.name,
                  organisationOther: '',
                  organisationIsOther: false,
                  organisationIsPseudo: choice.isPseudo,
                  organisationType: choice.type,
                  ...(choice.isPseudo && choice.type === 'independent' && !draft.seniority
                    ? { seniority: 'independent_professional' as Seniority }
                    : {}),
                })
              : set({
                  organisationId: null,
                  organisationName: '',
                  organisationIsOther: true,
                  organisationIsPseudo: false,
                  organisationType: '',
                })
          }
        />
      </Field>
      {isOther ? (
        <Field
          id={`${id}-other`}
          label={t('profile.work.organisationName')}
          error={errors.organisationOther}
        >
          <Input
            id={`${id}-other`}
            value={draft.organisationOther}
            onChange={(event) => set({ organisationOther: event.target.value })}
            className="h-11 bg-white"
            aria-describedby={describedBy(`${id}-other`, errors.organisationOther)}
          />
        </Field>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id={`${id}-type`}
          label={t('profile.work.organisationType')}
          hint={typeLocked ? t('profile.work.typeLocked') : undefined}
          error={errors.organisationType}
        >
          <OptionSelect<OrganisationType>
            id={`${id}-type`}
            value={draft.organisationType}
            options={entries(labels.organisationType)}
            placeholder={t('profile.work.typePlaceholder')}
            onChange={(organisationType) => set({ organisationType })}
            error={errors.organisationType}
            disabled={typeLocked}
          />
        </Field>
        <Field id={`${id}-title`} label={t('profile.work.jobTitle')} error={errors.jobTitle}>
          <Input
            id={`${id}-title`}
            list={`${id}-titles`}
            value={draft.jobTitle}
            onChange={(event) => set({ jobTitle: event.target.value })}
            placeholder={t('profile.work.jobTitlePlaceholder')}
            className="h-11 bg-white"
            aria-invalid={errors.jobTitle ? true : undefined}
            aria-describedby={describedBy(`${id}-title`, errors.jobTitle)}
          />
          <datalist id={`${id}-titles`}>
            {JOB_TITLE_SUGGESTIONS.map((title) => (
              <option key={title} value={title} />
            ))}
          </datalist>
        </Field>
        <Field
          id={`${id}-function`}
          label={t('profile.work.jobFunction')}
          error={errors.jobFunction}
        >
          <OptionSelect<JobFunction>
            id={`${id}-function`}
            value={draft.jobFunction}
            options={entries(labels.jobFunction)}
            placeholder={t('profile.work.functionPlaceholder')}
            onChange={(jobFunction) => set({ jobFunction })}
            error={errors.jobFunction}
          />
        </Field>
        <Field id={`${id}-seniority`} label={t('profile.work.seniority')} error={errors.seniority}>
          <OptionSelect<Seniority>
            id={`${id}-seniority`}
            value={draft.seniority}
            options={entries(labels.seniority)}
            placeholder={t('profile.work.seniorityPlaceholder')}
            onChange={(seniority) => set({ seniority })}
            error={errors.seniority}
          />
        </Field>
      </div>
      <Field
        id={`${id}-experience`}
        label={t('profile.work.experience')}
        hint={t('profile.work.experienceHint')}
        error={errors.experience}
      >
        <OptionSelect<ExperienceBand>
          id={`${id}-experience`}
          value={draft.experience}
          options={entries(labels.experience)}
          placeholder={t('profile.work.experiencePlaceholder')}
          onChange={(experience) => set({ experience })}
          error={errors.experience}
          hint
        />
      </Field>
    </div>
  )
}
