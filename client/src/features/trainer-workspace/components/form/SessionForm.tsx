import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, MapPin, MonitorPlay } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { SessionInfo } from '@/features/sessions/types'
import { useAppForm } from '@/hooks/useAppForm'
import { ApiError } from '@/lib/api'
import { learnerLocal, qatarToIso } from '@/lib/format/qatar-time'
import { cn } from '@/lib/utils'
import { useCreateSession, useUpdateSession } from '../../queries/trainer.queries'
import type { FormOptions } from '../../types'
import { FormSection } from './FormSection'
import { type SessionFormValues, toFormValues, toPayload, validateSession } from './form-values'
import { SelectField } from './SelectField'

/**
 * Create or edit a session with every field brief §10 requires. Validation uses the API's own
 * schema, so the form and the server agree; conflicts and permission answers come back from
 * the server and are shown at the top.
 */
export function SessionForm({ options, session }: { options: FormOptions; session?: SessionInfo }) {
  const navigate = useNavigate()
  const create = useCreateSession()
  const update = useUpdateSession(session?.id ?? '')
  const [serverError, setServerError] = useState<string | null>(null)
  const [publishOnSave, setPublishOnSave] = useState(false)
  const editing = Boolean(session)
  const isTrainer = options.trainers.length === 1

  const form = useAppForm({
    defaultValues: toFormValues(options, session),
    validators: {
      onSubmit: ({ value }) => {
        const fields = validateSession(value)
        return fields ? { fields } : undefined
      },
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        const payload = toPayload(value)
        if (session) {
          await update.mutateAsync(payload)
          toast.success('Session updated.')
          await navigate({ to: '/trainer/sessions/$sessionId', params: { sessionId: session.id } })
        } else {
          const created = await create.mutateAsync({ session: payload, publish: publishOnSave })
          toast.success(
            publishOnSave
              ? `${created.code} published to the eligible catalogue.`
              : `${created.code} saved as a draft.`,
          )
          await navigate({ to: '/trainer/sessions/$sessionId', params: { sessionId: created.id } })
        }
      } catch (err) {
        setServerError(
          err instanceof ApiError
            ? err.message
            : 'The session could not be saved. Check your connection and try again.',
        )
      }
    },
  })

  const programmeCode = (id: string) => options.programmes.find((p) => p.id === id)?.code

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
      className="flex flex-col gap-6"
    >
      {serverError ? (
        <p
          role="alert"
          className="flex gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" /> {serverError}
        </p>
      ) : null}

      <FormSection title="Session" description="What learners see in the catalogue.">
        <div className="sm:col-span-2">
          <form.AppField name="title">{(f) => <f.TextField label="Title" />}</form.AppField>
        </div>
        <form.AppField name="programmeId">
          {() => (
            <SelectField
              label="Programme"
              options={options.programmes.map((p) => ({
                value: p.id,
                label: `Program ${p.code}: ${p.title}`,
              }))}
              disabled={editing && isTrainer}
              description={
                editing && isTrainer
                  ? 'Programme reassignment needs an admin.'
                  : 'Only programmes you are approved for.'
              }
            />
          )}
        </form.AppField>
        <form.AppField name="trainerId">
          {() => (
            <SelectField
              label="Trainer"
              options={options.trainers.map((t) => ({ value: t.id, label: `${t.code} ${t.name}` }))}
              disabled={isTrainer}
            />
          )}
        </form.AppField>
        <form.Subscribe selector={(s) => programmeCode(s.values.programmeId)}>
          {(code) =>
            code === 'A' ? (
              <>
                <form.AppField name="level">{(f) => <f.TextField label="Level" />}</form.AppField>
                <form.AppField name="stage">
                  {(f) => <f.TextField label="Path stage" />}
                </form.AppField>
                <div className="sm:col-span-2">
                  <form.AppField name="prerequisite">
                    {() => (
                      <SelectField
                        label="Prerequisite"
                        options={options.prerequisites}
                        description="Locked sessions explain the missing prerequisite to learners."
                      />
                    )}
                  </form.AppField>
                </div>
              </>
            ) : (
              <p className="rounded-lg bg-sand px-3 py-2 text-sm text-ink-soft sm:col-span-2">
                Program {code} sessions are optional and never become required programme gates.
              </p>
            )
          }
        </form.Subscribe>
        <div className="sm:col-span-2">
          <form.AppField name="description">
            {(f) => <f.TextareaField label="Description" rows={3} />}
          </form.AppField>
        </div>
      </FormSection>

      <FormSection
        title="Date and time"
        description="Asia/Qatar is the default timezone. Learners also see their local time."
      >
        <form.AppField name="date">
          {(f) => <f.TextField label="Date (Qatar)" type="date" />}
        </form.AppField>
        <div className="grid gap-2">
          <Label htmlFor="tz">Timezone</Label>
          <input
            id="tz"
            readOnly
            value="Asia/Qatar (UTC+3)"
            className="h-10 rounded-lg border bg-sand px-3 text-sm text-ink-soft"
          />
        </div>
        <form.AppField name="startTime">
          {(f) => <f.TextField label="Start time" type="time" />}
        </form.AppField>
        <form.AppField name="endTime">
          {(f) => <f.TextField label="End time" type="time" />}
        </form.AppField>
        <form.Subscribe
          selector={(s) =>
            s.values.date && s.values.startTime
              ? learnerLocal(qatarToIso(s.values.date, s.values.startTime))
              : null
          }
        >
          {(local) =>
            local ? (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Learner-local preview: {local}
              </p>
            ) : null
          }
        </form.Subscribe>
        <form.AppField name="capacity">
          {(f) => <f.TextField label="Capacity (seats)" type="number" />}
        </form.AppField>
        <div className="grid grid-cols-[1fr_8rem] gap-2">
          <form.AppField name="deadlineDate">
            {(f) => <f.TextField label="Booking deadline" type="date" />}
          </form.AppField>
          <form.AppField name="deadlineTime">
            {(f) => <f.TextField label="Time" type="time" />}
          </form.AppField>
        </div>
      </FormSection>

      <FormSection
        title="Format and place"
        description="In person needs a venue, room and access note. Live online needs a demo meeting room and join instructions."
      >
        <form.Field name="format">
          {(field) => (
            <RadioGroup
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v as SessionFormValues['format'])}
              className="grid grid-cols-2 gap-3 sm:col-span-2"
              aria-label="Format"
            >
              {(['in_person', 'online'] as const).map((value) => {
                const Icon = value === 'online' ? MonitorPlay : MapPin
                return (
                  <label
                    key={value}
                    htmlFor={`format-${value}`}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors has-[:checked]:border-teal has-[:checked]:bg-teal-mist/60',
                    )}
                  >
                    <RadioGroupItem id={`format-${value}`} value={value} />
                    <Icon aria-hidden className="size-5 text-teal" />
                    <span className="text-sm font-medium">
                      {value === 'online' ? 'Live online' : 'In person'}
                    </span>
                  </label>
                )
              })}
            </RadioGroup>
          )}
        </form.Field>
        <form.Subscribe selector={(s) => s.values.format}>
          {(format) =>
            format === 'in_person' ? (
              <>
                <form.AppField name="venue">
                  {(f) => <f.TextField label="Venue (fictional)" />}
                </form.AppField>
                <form.AppField name="room">{(f) => <f.TextField label="Room" />}</form.AppField>
                <div className="sm:col-span-2">
                  <form.AppField name="accessNote">
                    {(f) => <f.TextareaField label="Access note" rows={2} />}
                  </form.AppField>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2 sm:col-span-2">
                  <form.AppField name="meetingRef">
                    {(f) => (
                      <f.TextField
                        label="Demo meeting-room reference"
                        placeholder="DEMO-ROOM-T01-4"
                      />
                    )}
                  </form.AppField>
                  <SimulatedTag
                    label="Simulated online classroom: no real meeting is created"
                    className="w-fit"
                  />
                </div>
                <div className="sm:col-span-2">
                  <form.AppField name="joinInstructions">
                    {(f) => <f.TextareaField label="Join instructions" rows={2} />}
                  </form.AppField>
                </div>
              </>
            )
          }
        </form.Subscribe>
      </FormSection>

      <FormSection title="Policy and materials">
        <div className="sm:col-span-2">
          <form.AppField name="cancellationPolicy">
            {(f) => <f.TextareaField label="Cancellation policy" rows={2} />}
          </form.AppField>
        </div>
        <div className="sm:col-span-2">
          <form.AppField name="materials">
            {(f) => (
              <f.TextareaField
                label="Materials (one per line)"
                rows={3}
                placeholder="Greeting practice card"
              />
            )}
          </form.AppField>
        </div>
      </FormSection>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap justify-end gap-2 border-t bg-sand/90 px-4 py-3 backdrop-blur-md md:mx-0 md:rounded-xl md:border">
        <Button type="button" variant="ghost" onClick={() => window.history.back()}>
          Discard
        </Button>
        {editing ? (
          <form.SubmitButton>Save changes</form.SubmitButton>
        ) : (
          <>
            <Button type="submit" variant="outline" onClick={() => setPublishOnSave(false)}>
              Save as draft
            </Button>
            <Button type="submit" onClick={() => setPublishOnSave(true)}>
              Publish to catalogue
            </Button>
          </>
        )}
      </div>
    </form>
  )
}
