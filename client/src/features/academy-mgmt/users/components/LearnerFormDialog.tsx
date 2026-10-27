import type { ExperienceBand, JobFunction, ProgrammeCode, Seniority } from '@shared/constants'
import {
  EXPERIENCE_LABELS,
  JOB_FUNCTION_LABELS,
  PROGRAMME_LABELS,
  SENIORITY_LABELS,
} from '@shared/schemas/admin-labels'
import { useQuery } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ApiError } from '@/lib/api'
import { Field } from '../../hub/components/Field'
import { OptionSelect, optionsOf } from '../../hub/components/OptionSelect'
import { useCreateLearner, userOptionsQuery, useUpdateLearner } from '../queries/users.queries'

export type LearnerFormValues = {
  name: string
  email: string
  organisationId: string | null
  jobTitle: string
  jobFunction: JobFunction | null
  seniority: Seniority | null
  experience: ExperienceBand | null
}

const EMPTY: LearnerFormValues = {
  name: '',
  email: '',
  organisationId: null,
  jobTitle: '',
  jobFunction: null,
  seniority: null,
  experience: null,
}

function validate(values: LearnerFormValues, creating: boolean) {
  const errors: Partial<Record<keyof LearnerFormValues, string>> = {}
  if (values.name.trim().length < 2) errors.name = 'Enter the full name'
  if (creating) {
    if (!/^[^\s@]+@[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address'
    else if (!values.email.trim().toLowerCase().endsWith('@example.com'))
      errors.email = 'Use a fictional address ending in example.com'
  }
  return errors
}

/** Add or edit a fictional learner (brief §14 User management). */
export function LearnerFormDialog({
  open,
  onOpenChange,
  userId,
  initial,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing. */
  userId?: string
  initial?: Partial<LearnerFormValues>
  onCreated?: (userId: string) => void
}) {
  const creating = !userId
  const options = useQuery({ ...userOptionsQuery(), enabled: open })
  const create = useCreateLearner()
  const update = useUpdateLearner(userId ?? '')
  const [values, setValues] = useState<LearnerFormValues>(EMPTY)
  const [invite, setInvite] = useState(true)
  const [programme, setProgramme] = useState<ProgrammeCode | null>('B')
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValues({ ...EMPTY, ...initial })
      setInvite(true)
      setProgramme('B')
      setSubmitted(false)
      setServerError(null)
    }
  }, [open, initial])

  const errors = validate(values, creating)
  const set = <K extends keyof LearnerFormValues>(key: K, value: LearnerFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))
  const pending = create.isPending || update.isPending

  async function submit() {
    setSubmitted(true)
    setServerError(null)
    if (Object.keys(errors).length) return
    const profile = {
      name: values.name.trim(),
      organisationId: values.organisationId,
      jobTitle: values.jobTitle.trim() || null,
      jobFunction: values.jobFunction,
      seniority: values.seniority,
      experience: values.experience,
    }
    try {
      if (creating) {
        const result = await create.mutateAsync({
          ...profile,
          email: values.email.trim(),
          invite,
          programme,
        })
        toast.success(`${profile.name} added as ${result.learnerCode}`, {
          description: invite
            ? 'Demo email generated in the notification log; no external email was sent.'
            : 'No invitation was sent.',
        })
        onOpenChange(false)
        onCreated?.(result.userId)
      } else {
        await update.mutateAsync(profile)
        toast.success('Learner profile updated', {
          description: 'The change is recorded in the audit trail.',
        })
        onOpenChange(false)
      }
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : 'The learner could not be saved. Try again.',
      )
    }
  }

  const err = (key: keyof LearnerFormValues) => (submitted ? (errors[key] ?? null) : null)
  const orgOptions = (options.data?.organisations ?? []).map((o) => ({
    value: o.id,
    label: o.name,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            {creating ? 'Add a fictional learner' : 'Edit learner profile'}
          </DialogTitle>
          <DialogDescription>
            Demo data only. Use fictional names and an address ending in example.com. No phone
            numbers or identity documents are stored.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          noValidate
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="lf-name" label="Full name" error={err('name')}>
              <Input
                id="lf-name"
                value={values.name}
                onChange={(e) => set('name', e.target.value)}
                aria-invalid={Boolean(err('name'))}
              />
            </Field>
            <Field
              id="lf-email"
              label="Email"
              hint="Controlled field: visible to administrators only"
              error={err('email')}
            >
              <Input
                id="lf-email"
                type="email"
                value={values.email}
                disabled={!creating}
                onChange={(e) => set('email', e.target.value)}
                aria-invalid={Boolean(err('email'))}
              />
            </Field>
            <Field id="lf-org" label="Organisation">
              <OptionSelect
                id="lf-org"
                value={values.organisationId}
                onChange={(v) => set('organisationId', v)}
                options={orgOptions}
                placeholder={options.isPending ? 'Loading organisations' : 'Select an organisation'}
                allowNone
                noneLabel="Not specified"
              />
            </Field>
            <Field id="lf-title" label="Job title">
              <Input
                id="lf-title"
                value={values.jobTitle}
                onChange={(e) => set('jobTitle', e.target.value)}
              />
            </Field>
            <Field id="lf-function" label="Job function">
              <OptionSelect
                id="lf-function"
                value={values.jobFunction}
                onChange={(v) => set('jobFunction', v as JobFunction | null)}
                options={optionsOf(JOB_FUNCTION_LABELS)}
                allowNone
                noneLabel="Not specified"
              />
            </Field>
            <Field id="lf-seniority" label="Seniority">
              <OptionSelect
                id="lf-seniority"
                value={values.seniority}
                onChange={(v) => set('seniority', v as Seniority | null)}
                options={optionsOf(SENIORITY_LABELS)}
                allowNone
                noneLabel="Not specified"
              />
            </Field>
            <Field id="lf-experience" label="Experience">
              <OptionSelect
                id="lf-experience"
                value={values.experience}
                onChange={(v) => set('experience', v as ExperienceBand | null)}
                options={optionsOf(EXPERIENCE_LABELS)}
                allowNone
                noneLabel="Not specified"
              />
            </Field>
            {creating ? (
              <Field
                id="lf-programme"
                label="First enrolment"
                hint="The path is assigned by the programme rules"
              >
                <OptionSelect
                  id="lf-programme"
                  value={programme}
                  onChange={(v) => setProgramme(v as ProgrammeCode | null)}
                  options={optionsOf(PROGRAMME_LABELS)}
                  allowNone
                  noneLabel="Do not enrol yet"
                />
              </Field>
            ) : null}
          </div>
          {creating ? (
            <div className="flex items-start justify-between gap-4 rounded-xl border bg-teal-mist/50 p-4">
              <div className="flex gap-3">
                <MailCheck aria-hidden className="mt-0.5 size-5 text-teal" />
                <div className="grid gap-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                    Invite through the demo log <SimulatedTag label="Demo email, not sent" />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Creates an in-app notification and a simulated email in the notification log.
                    The learner sets a password from the invitation.
                  </p>
                </div>
              </div>
              <Switch
                checked={invite}
                onCheckedChange={setInvite}
                aria-label="Invite through the demo log"
              />
            </div>
          ) : null}
          {serverError ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving' : creating ? 'Add learner' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
