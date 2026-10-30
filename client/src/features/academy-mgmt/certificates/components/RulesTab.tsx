import { CPD_UNITS, type CpdUnit } from '@shared/constants/enums'
import type { DemoSettings } from '@shared/types/db'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DemoSettingsNote } from '@/components/layout/DemoSettingsNote'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ApiError } from '@/lib/api-error'
import { Field } from '../../hub/components/Field'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { Panel } from '../../hub/components/Panel'
import { ErrorPanel } from '../../hub/components/QueryStates'
import { rulesQuery, useUpdateRules } from '../queries/certificates-admin.queries'

interface Draft {
  credentialValidityMonths: string
  cpdTarget: string
  cpdUnit: CpdUnit
  cpdHoursPerCredit: string
  reminderDaysBefore: string
  programmeBCpdEnabled: boolean
  programmeBCpdPerCourse: string
}

const toDraft = (s: DemoSettings): Draft => ({
  credentialValidityMonths: String(s.credentialValidityMonths),
  cpdTarget: String(s.cpdTarget),
  cpdUnit: s.cpdUnit,
  cpdHoursPerCredit: String(s.cpdHoursPerCredit),
  reminderDaysBefore: s.reminderDaysBefore.join(', '),
  programmeBCpdEnabled: s.programmeBCpdEnabled,
  programmeBCpdPerCourse: String(s.programmeBCpdPerCourse),
})

/** Parses "60, 30, 7" into whole days; null when any part is not a whole number of days >= 1. */
function parseDays(value: string): number[] | null {
  const parts = value.split(/[,\s]+/).filter(Boolean)
  if (parts.length === 0) return null
  const days = parts.map(Number)
  return days.every((d) => Number.isInteger(d) && d >= 1) ? days : null
}

export function RulesTab() {
  const query = useQuery(rulesQuery())
  const update = useUpdateRules()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    if (query.data && !draft) setDraft(toDraft(query.data.settings))
  }, [query.data, draft])

  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => void query.refetch()} />
  if (!query.data || !draft) return <div className="h-64 animate-pulse rounded-xl bg-muted" />
  const meta = query.data

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))

  const days = parseDays(draft.reminderDaysBefore)
  const errors = {
    validity:
      Number.isInteger(Number(draft.credentialValidityMonths)) &&
      Number(draft.credentialValidityMonths) >= 1
        ? null
        : 'Enter a whole number of months, at least 1',
    target: Number(draft.cpdTarget) >= 0 && draft.cpdTarget !== '' ? null : 'Enter 0 or more',
    conversion: Number(draft.cpdHoursPerCredit) > 0 ? null : 'Enter a number above 0',
    reminders: days
      ? null
      : 'Enter whole days of at least 1, separated by commas, such as 60, 30, 7',
    programmeB: Number(draft.programmeBCpdPerCourse) >= 0 ? null : 'Enter 0 or more',
  }
  const invalid = Object.values(errors).some(Boolean)
  const show = (message: string | null) => (attempted ? message : null)

  return (
    <div className="grid gap-6">
      <Panel
        title="Credential and CPD rules"
        description={`Rule version ${meta.ruleVersion}. Changes apply to new credentials and to every derived status and reminder; issued credentials keep their own expiry date.`}
        action={<DemoSettingsNote />}
      >
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            setAttempted(true)
            if (invalid || !days) return
            update.mutate(
              {
                credentialValidityMonths: Number(draft.credentialValidityMonths),
                cpdTarget: Number(draft.cpdTarget),
                cpdUnit: draft.cpdUnit,
                cpdHoursPerCredit: Number(draft.cpdHoursPerCredit),
                reminderDaysBefore: days,
                programmeBCpdEnabled: draft.programmeBCpdEnabled,
                programmeBCpdPerCourse: Number(draft.programmeBCpdPerCourse),
              },
              {
                onSuccess: (saved) => {
                  setDraft(toDraft(saved))
                  setAttempted(false)
                  toast.success('Rules saved and recorded in the audit trail')
                },
                onError: (error) =>
                  toast.error(
                    error instanceof ApiError ? error.message : 'The rules could not be saved',
                  ),
              },
            )
          }}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              id="rule-validity"
              label="Validity (months from issue)"
              hint="Program A demo certificate: 12 months."
              error={show(errors.validity)}
            >
              <Input
                id="rule-validity"
                type="number"
                min={1}
                value={draft.credentialValidityMonths}
                onChange={(e) => set('credentialValidityMonths', e.target.value)}
              />
            </Field>
            <Field
              id="rule-reminders"
              label="Reminders (days before expiry)"
              hint="Demo: 60, 30 and 7. The largest value is also the 'Expiring soon' window."
              error={show(errors.reminders)}
            >
              <Input
                id="rule-reminders"
                value={draft.reminderDaysBefore}
                onChange={(e) => set('reminderDaysBefore', e.target.value)}
              />
            </Field>
            <Field
              id="rule-target"
              label="Annual CPD target"
              hint="Illustrative target: 8 hours."
              error={show(errors.target)}
            >
              <Input
                id="rule-target"
                type="number"
                min={0}
                step="0.25"
                value={draft.cpdTarget}
                onChange={(e) => set('cpdTarget', e.target.value)}
              />
            </Field>
            <Field id="rule-unit" label="CPD unit">
              <OptionSelect
                id="rule-unit"
                value={draft.cpdUnit}
                onChange={(unit) => set('cpdUnit', (unit ?? 'hours') as CpdUnit)}
                options={CPD_UNITS.map((u) => ({ value: u, label: u }))}
              />
            </Field>
            <Field
              id="rule-conversion"
              label="Hours per credit"
              hint="The only defined conversion. Hours and credits are never added without it."
              error={show(errors.conversion)}
            >
              <Input
                id="rule-conversion"
                type="number"
                min={0}
                step="0.25"
                value={draft.cpdHoursPerCredit}
                onChange={(e) => set('cpdHoursPerCredit', e.target.value)}
              />
            </Field>
          </div>

          <fieldset className="grid gap-3 rounded-xl border p-4">
            <legend className="px-2 text-sm font-medium">Program B CPD recognition</legend>
            <div className="flex items-start gap-3">
              <Switch
                id="rule-b"
                checked={draft.programmeBCpdEnabled}
                onCheckedChange={(checked) => set('programmeBCpdEnabled', checked)}
              />
              <label htmlFor="rule-b" className="grid gap-0.5 text-sm">
                <span className="font-medium">
                  Count completed Program B courses as CPD (
                  {draft.programmeBCpdEnabled ? 'on' : 'off'})
                </span>
                <span className="text-muted-foreground">
                  Off until Qatar Tourism confirms. Turning it on adds CPD only; Program B never
                  gains a programme certificate.
                </span>
              </label>
            </div>
            <Field
              id="rule-b-amount"
              label="CPD per completed Program B course"
              error={show(errors.programmeB)}
            >
              <Input
                id="rule-b-amount"
                type="number"
                min={0}
                step="0.25"
                className="max-w-40"
                value={draft.programmeBCpdPerCourse}
                onChange={(e) => set('programmeBCpdPerCourse', e.target.value)}
              />
            </Field>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving' : 'Save rules'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft(toDraft(meta.settings))
                setAttempted(false)
              }}
            >
              Discard changes
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="Fixed demonstration values" action={<DemoSettingsNote />}>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">CPD per Academy credential</dt>
            <dd className="font-medium">{meta.credentialCpdHours} hours</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">CPD earned by the refresher course</dt>
            <dd className="font-medium">{meta.refresherCpdHours} hours</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Renewal check pass mark</dt>
            <dd className="font-medium">{meta.renewalCheckPassPercent}%</dd>
          </div>
        </dl>
      </Panel>
    </div>
  )
}
