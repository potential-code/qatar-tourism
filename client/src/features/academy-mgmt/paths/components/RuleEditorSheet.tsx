import type { ProgrammeCode, RuleStatus } from '@shared/constants'
import type { RuleGroup } from '@shared/content/paths'
import type { PreviewRule } from '@shared/schemas/admin-paths'
import { Lock } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useDebounced } from '../hooks/useDebounced'
import { useSaveRule } from '../queries/paths.queries'
import type { PathSummary, RuleRow } from '../types'
import { describeGroup } from '../utils/rules'
import { ConditionsEditor } from './ConditionsEditor'
import { MatchPreview } from './MatchPreview'

type Form = {
  name: string
  summary: string
  pathId: string
  priority: number
  status: RuleStatus
  conditions: RuleGroup
}

const toPreview = (rule: RuleRow): PreviewRule => ({
  id: rule.id,
  name: rule.name,
  programme: rule.programme,
  pathId: rule.pathId,
  priority: rule.priority,
  isDefault: rule.isDefault,
  conditions: rule.conditions as PreviewRule['conditions'],
  summary: rule.summary,
  status: rule.status,
})

/**
 * Create or edit an assignment rule, with a live preview of the unsaved rule set against a
 * learner's profile (brief §14 "preview the match before publishing").
 */
export function RuleEditorSheet({
  open,
  onOpenChange,
  programme,
  rule,
  rules,
  paths,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  programme: ProgrammeCode
  /** The rule being edited; undefined for a new rule. */
  rule?: RuleRow
  rules: RuleRow[]
  paths: PathSummary[]
}) {
  const save = useSaveRule()
  const published = paths.filter((p) => p.current)
  const [form, setForm] = useState<Form>(() => initial(rule, published))

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the sheet opens or a different rule is chosen
  useEffect(() => {
    if (open) setForm(initial(rule, published))
  }, [open, rule?.id])

  const isDefault = rule?.isDefault ?? false
  const draftRules = useMemo<PreviewRule[]>(() => {
    const edited: PreviewRule = {
      ...(rule ? { id: rule.id } : {}),
      name: form.name || 'Unsaved rule',
      programme,
      pathId: form.pathId,
      priority: form.priority,
      isDefault,
      conditions: form.conditions as PreviewRule['conditions'],
      summary: form.summary || 'Unsaved rule',
      status: form.status,
    }
    const others = rules.filter((r) => r.id !== rule?.id).map(toPreview)
    return form.pathId ? [...others, edited] : others
  }, [form, rules, rule, programme, isDefault])
  const previewRules = useDebounced(draftRules, 450)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate(
      {
        id: rule?.id,
        input: {
          name: form.name,
          programme,
          pathId: form.pathId,
          priority: form.priority,
          isDefault,
          conditions: form.conditions as PreviewRule['conditions'],
          summary: form.summary,
          status: form.status,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            rule
              ? 'Rule updated and logged in the audit trail'
              : 'Rule created and logged in the audit trail',
          )
          onOpenChange(false)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[1040px]">
        <form onSubmit={submit} className="grid min-h-full grid-rows-[auto_1fr_auto]">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="font-display text-2xl font-normal">
              {rule ? `Edit rule: ${rule.name}` : `New Program ${programme} rule`}
            </SheetTitle>
            <SheetDescription>
              Rules choose a learner's path from their profile. Higher priority wins when several
              match.
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-5">
              <div className="grid gap-1.5">
                <Label htmlFor="rule-name">Rule name</Label>
                <Input
                  id="rule-name"
                  required
                  minLength={3}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rule-summary">Rule wording</Label>
                <Input
                  id="rule-summary"
                  required
                  minLength={3}
                  value={form.summary}
                  placeholder="e.g. Organisation type = hotel AND job function = front office"
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.9fr)] gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="rule-path">Assigns path</Label>
                  <Select
                    value={form.pathId}
                    onValueChange={(v) => setForm({ ...form, pathId: v })}
                  >
                    <SelectTrigger id="rule-path" className="w-full">
                      <SelectValue placeholder="Choose a published path" />
                    </SelectTrigger>
                    <SelectContent>
                      {published.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="rule-priority">Priority</Label>
                  <Input
                    id="rule-priority"
                    type="number"
                    min={0}
                    max={1000}
                    disabled={isDefault}
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="rule-status">Status</Label>
                  <Select
                    value={form.status}
                    disabled={isDefault}
                    onValueChange={(v) => setForm({ ...form, status: v as RuleStatus })}
                  >
                    <SelectTrigger id="rule-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isDefault ? (
                <p className="flex items-start gap-2 rounded-lg bg-teal-mist/70 p-3 text-sm text-teal-deep">
                  <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
                  The default rule has no conditions. It applies when no specific rule matches, and
                  always when a profile is incomplete. Change it by setting a default path.
                </p>
              ) : (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Conditions</p>
                  <ConditionsEditor
                    group={form.conditions}
                    onChange={(conditions) => setForm({ ...form, conditions })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Reads as: {describeGroup(form.conditions)}
                  </p>
                </div>
              )}
            </div>

            <aside className="grid content-start gap-3 rounded-xl border bg-sand/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg">Live match preview</h3>
                <span className="rounded-full border border-maroon/20 bg-maroon-mist px-2 py-0.5 text-[11px] font-medium text-maroon-deep">
                  Includes unsaved changes
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Uses the learner's real profile. Nothing is saved until you choose Save rule.
              </p>
              {open ? <MatchPreview programme={programme} rules={previewRules} compact /> : null}
            </aside>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t bg-card px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !form.pathId}>
              {save.isPending ? 'Saving' : 'Save rule'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function initial(rule: RuleRow | undefined, published: PathSummary[]): Form {
  if (rule)
    return {
      name: rule.name,
      summary: rule.summary,
      pathId: rule.pathId,
      priority: rule.priority,
      status: rule.status,
      conditions: rule.conditions as RuleGroup,
    }
  return {
    name: '',
    summary: '',
    pathId: published[0]?.id ?? '',
    priority: 30,
    status: 'draft',
    conditions: {
      op: 'AND',
      conditions: [{ field: 'organisationType', operator: 'eq', value: 'hotel_accommodation' }],
    },
  }
}
