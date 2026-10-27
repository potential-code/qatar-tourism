import type { ProgrammeCode } from '@shared/constants'
import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api'
import { Field } from '../../hub/components/Field'
import { useCreateTrainer, useUpdateTrainer } from '../queries/trainers.queries'

type Values = {
  fullName: string
  email: string
  headline: string
  bio: string
  expertise: string
  languages: string
  organisation: string
  programmes: ProgrammeCode[]
}

const split = (text: string) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

function validate(v: Values, creating: boolean) {
  const e: Partial<Record<keyof Values, string>> = {}
  if (v.fullName.trim().length < 2) e.fullName = 'Enter the full name'
  if (creating && !v.email.trim().toLowerCase().endsWith('@example.com'))
    e.email = 'Use a fictional address ending in example.com'
  if (v.headline.trim().length < 2) e.headline = 'Enter a headline'
  if (v.bio.trim().length < 10) e.bio = 'Write a short bio of at least 10 characters'
  if (split(v.languages).length === 0) e.languages = 'Add at least one language'
  if (v.organisation.trim().length < 2) e.organisation = 'Enter the organisation'
  return e
}

/** Add an admin-provisioned trainer, or edit a trainer's public profile (brief §14, §16). */
export function TrainerFormDialog({
  open,
  onOpenChange,
  trainerId,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trainerId?: string
  initial?: Partial<Values>
}) {
  const creating = !trainerId
  const create = useCreateTrainer()
  const update = useUpdateTrainer(trainerId ?? '')
  const [v, setV] = useState<Values>({
    fullName: '',
    email: '',
    headline: '',
    bio: '',
    expertise: '',
    languages: 'Arabic, English',
    organisation: 'Demo Academy Faculty',
    programmes: ['A'],
  })
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setV((prev) => ({
        ...prev,
        ...(creating ? { fullName: '', email: '', headline: '', bio: '', expertise: '' } : {}),
        ...initial,
      }))
      setSubmitted(false)
      setServerError(null)
    }
  }, [open, initial, creating])

  const errors = validate(v, creating)
  const err = (k: keyof Values) => (submitted ? (errors[k] ?? null) : null)
  const set = <K extends keyof Values>(k: K, value: Values[K]) =>
    setV((prev) => ({ ...prev, [k]: value }))
  const pending = create.isPending || update.isPending

  async function submit() {
    setSubmitted(true)
    setServerError(null)
    if (Object.keys(errors).length) return
    const profile = {
      fullName: v.fullName.trim(),
      headline: v.headline.trim(),
      bio: v.bio.trim(),
      expertise: split(v.expertise),
      languages: split(v.languages),
      organisation: v.organisation.trim(),
    }
    try {
      if (creating) {
        const r = await create.mutateAsync({
          ...profile,
          email: v.email.trim(),
          programmes: v.programmes,
        })
        toast.success(`Trainer ${r.code} provisioned`, {
          description: 'The account was created by an administrator and audited.',
        })
      } else {
        await update.mutateAsync(profile)
        toast.success('Trainer profile updated')
      }
      onOpenChange(false)
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'The trainer could not be saved')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            {creating ? 'Provision a trainer' : 'Edit trainer profile'}
          </DialogTitle>
          <DialogDescription>
            {creating
              ? 'Trainer accounts are created by an administrator only. Public self-registration can never create a trainer.'
              : 'All trainers and providers are fictional.'}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="tf-name" label="Full name" error={err('fullName')}>
              <Input
                id="tf-name"
                value={v.fullName}
                onChange={(e) => set('fullName', e.target.value)}
              />
            </Field>
            {creating ? (
              <Field id="tf-email" label="Email" error={err('email')}>
                <Input
                  id="tf-email"
                  type="email"
                  value={v.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
            ) : (
              <Field id="tf-org" label="Organisation" error={err('organisation')}>
                <Input
                  id="tf-org"
                  value={v.organisation}
                  onChange={(e) => set('organisation', e.target.value)}
                />
              </Field>
            )}
            <Field id="tf-headline" label="Headline" error={err('headline')}>
              <Input
                id="tf-headline"
                value={v.headline}
                onChange={(e) => set('headline', e.target.value)}
              />
            </Field>
            <Field
              id="tf-languages"
              label="Languages"
              hint="Separate with commas"
              error={err('languages')}
            >
              <Input
                id="tf-languages"
                value={v.languages}
                onChange={(e) => set('languages', e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field id="tf-expertise" label="Expertise" hint="Separate with commas">
                <Input
                  id="tf-expertise"
                  value={v.expertise}
                  onChange={(e) => set('expertise', e.target.value)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field id="tf-bio" label="Bio" error={err('bio')}>
                <Textarea
                  id="tf-bio"
                  rows={4}
                  className="rounded-lg"
                  value={v.bio}
                  onChange={(e) => set('bio', e.target.value)}
                />
              </Field>
            </div>
          </div>
          {creating ? (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">Approved programmes</legend>
              <div className="flex flex-wrap gap-4">
                {(['A', 'B', 'C'] as const).map((code) => (
                  <label
                    key={code}
                    htmlFor={`tf-prog-${code}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      id={`tf-prog-${code}`}
                      checked={v.programmes.includes(code)}
                      onCheckedChange={(on) =>
                        set(
                          'programmes',
                          on ? [...v.programmes, code] : v.programmes.filter((p) => p !== code),
                        )
                      }
                    />
                    {PROGRAMME_LABELS[code]}
                  </label>
                ))}
              </div>
            </fieldset>
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
              {pending ? 'Saving' : creating ? 'Provision trainer' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
