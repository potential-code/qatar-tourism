import type { ExperienceBand, JobFunction, OrganisationType, Seniority } from '@shared/constants'
import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { describedBy, Field } from '../components/Field'
import { OptionSelect } from '../components/OptionSelect'
import { OrganisationPicker } from '../components/OrganisationPicker'
import type { ProfileDraft } from '../utils/draft'
import {
  EXPERIENCE_LABEL,
  JOB_FUNCTION_LABEL,
  JOB_TITLE_SUGGESTIONS,
  ORGANISATION_TYPE_LABEL,
  SENIORITY_LABEL,
} from '../utils/options'
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
  const id = useId()
  const isOther = draft.organisationIsOther
  const typeLocked = !isOther && Boolean(draft.organisationId)
  return (
    <div className="grid gap-6">
      <Field
        id={`${id}-org`}
        label="Organisation"
        hint="Search the fictional organisations, or choose Independent professional, Not currently employed or Other."
        error={errors.organisation}
      >
        <OrganisationPicker
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
        <Field id={`${id}-other`} label="Organisation name" error={errors.organisationOther}>
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
          label="Organisation type"
          hint={typeLocked ? 'Set by the organisation you chose.' : undefined}
          error={errors.organisationType}
        >
          <OptionSelect<OrganisationType>
            id={`${id}-type`}
            value={draft.organisationType}
            options={entries(ORGANISATION_TYPE_LABEL)}
            placeholder="Choose a type"
            onChange={(organisationType) => set({ organisationType })}
            error={errors.organisationType}
            disabled={typeLocked}
          />
        </Field>
        <Field id={`${id}-title`} label="Job title" error={errors.jobTitle}>
          <Input
            id={`${id}-title`}
            list={`${id}-titles`}
            value={draft.jobTitle}
            onChange={(event) => set({ jobTitle: event.target.value })}
            placeholder="Start typing, for example Front Office Agent"
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
        <Field id={`${id}-function`} label="Job function" error={errors.jobFunction}>
          <OptionSelect<JobFunction>
            id={`${id}-function`}
            value={draft.jobFunction}
            options={entries(JOB_FUNCTION_LABEL)}
            placeholder="Choose a function"
            onChange={(jobFunction) => set({ jobFunction })}
            error={errors.jobFunction}
          />
        </Field>
        <Field id={`${id}-seniority`} label="Seniority" error={errors.seniority}>
          <OptionSelect<Seniority>
            id={`${id}-seniority`}
            value={draft.seniority}
            options={entries(SENIORITY_LABEL)}
            placeholder="Choose a level"
            onChange={(seniority) => set({ seniority })}
            error={errors.seniority}
          />
        </Field>
      </div>
      <Field
        id={`${id}-experience`}
        label="Experience in visitor-facing roles"
        hint="We use this to pitch examples at the right level. It is never treated as proof of competence."
        error={errors.experience}
      >
        <OptionSelect<ExperienceBand>
          id={`${id}-experience`}
          value={draft.experience}
          options={entries(EXPERIENCE_LABEL)}
          placeholder="Choose your experience"
          onChange={(experience) => set({ experience })}
          error={errors.experience}
          hint
        />
      </Field>
    </div>
  )
}
