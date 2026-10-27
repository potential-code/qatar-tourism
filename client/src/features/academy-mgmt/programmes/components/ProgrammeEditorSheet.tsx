import { PROGRAMME_STATUSES, type ProgrammeStatus } from '@shared/constants'
import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Archive, ArrowRight, Info, Lock } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { programmeDetailQuery, useUpdateProgramme } from '../queries/programmes.queries'
import type { ProgrammeDetail, ProgrammeSummary } from '../types'
import { ruleLabel, ruleValue, STATUS_LABEL } from '../utils/labels'
import { PublicCardPreview } from './PublicCardPreview'

type Form = {
  title: string
  summary: string
  audience: string
  status: ProgrammeStatus
  certificationEnabled: boolean
}

/** Edit a programme with a live public-card preview before saving (brief §14). */
export function ProgrammeEditorSheet({
  programme,
  onOpenChange,
}: {
  programme: ProgrammeSummary | null
  onOpenChange: (open: boolean) => void
}) {
  const detail = useQuery({
    ...programmeDetailQuery(programme?.id ?? ''),
    enabled: Boolean(programme),
  })
  const update = useUpdateProgramme(programme?.id ?? '')
  const [form, setForm] = useState<Form | null>(null)

  useEffect(() => {
    if (programme)
      setForm({
        title: programme.title,
        summary: programme.summary,
        audience: programme.audience,
        status: programme.status,
        certificationEnabled: programme.certificationEnabled,
      })
  }, [programme])

  if (!programme || !form) return null
  const changed = (Object.keys(form) as (keyof Form)[]).filter((k) => form[k] !== programme[k])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const patch = Object.fromEntries(changed.map((k) => [k, form[k]]))
    update.mutate(patch, {
      onSuccess: () => {
        toast.success(`${PROGRAMME_LABELS[programme.code]} saved. The change is in the audit log.`)
        onOpenChange(false)
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[1120px]">
        <form onSubmit={submit} className="grid min-h-full grid-rows-[auto_1fr_auto]">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="font-display text-2xl font-normal">
              {PROGRAMME_LABELS[programme.code]}: {programme.title}
            </SheetTitle>
            <SheetDescription>
              Edit the public details and settings. The preview shows the card before you save.
            </SheetDescription>
          </SheetHeader>

          <div className="grid content-start gap-8 px-6 py-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              <div className="grid content-start gap-5">
                <div className="grid gap-1.5">
                  <Label htmlFor="prog-title">Title</Label>
                  <Input
                    id="prog-title"
                    required
                    minLength={3}
                    maxLength={120}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="prog-summary">Public description</Label>
                  <Textarea
                    id="prog-summary"
                    required
                    minLength={10}
                    maxLength={600}
                    rows={4}
                    value={form.summary}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="prog-audience">Audience</Label>
                  <Input
                    id="prog-audience"
                    required
                    minLength={3}
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  />
                </div>

                <fieldset className="grid gap-2">
                  <legend className="mb-1 text-sm font-medium">Status</legend>
                  <div className="inline-flex w-fit rounded-full border bg-card p-1">
                    {PROGRAMME_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={form.status === status}
                        onClick={() => setForm({ ...form, status })}
                        className={cn(
                          'rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                          form.status === status
                            ? 'bg-teal text-white'
                            : 'text-ink/70 hover:text-teal',
                        )}
                      >
                        {STATUS_LABEL[status]}
                      </button>
                    ))}
                  </div>
                  {form.status === 'archived' ? (
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Archive aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                      Archiving hides the programme from the public catalogue. Historical
                      enrolments, results and reports are kept.
                    </p>
                  ) : null}
                </fieldset>

                <div className="grid gap-2 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="prog-cert" className="grid gap-0.5">
                      <span className="font-medium">Certification</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        Issue a watermarked demo certificate when every condition passes.
                      </span>
                    </Label>
                    <Switch
                      id="prog-cert"
                      checked={form.certificationEnabled}
                      disabled={!programme.canCertify}
                      onCheckedChange={(v) => setForm({ ...form, certificationEnabled: v })}
                    />
                  </div>
                  {!programme.canCertify ? (
                    <p className="flex items-start gap-2 rounded-lg bg-sand-deep/60 p-2.5 text-xs text-ink/80">
                      <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                      {programme.code === 'B'
                        ? 'Program B never issues a certificate. This is enforced by the server, not only this switch.'
                        : 'Program C is an illustrative sample and does not certify. Enforced by the server.'}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-1 rounded-xl border bg-sand/60 p-4">
                  <p className="text-sm font-medium">Enrolment mode</p>
                  <p className="text-sm text-ink">{programme.enrolmentMode.label}</p>
                  <p className="text-xs text-muted-foreground">{programme.enrolmentMode.detail}</p>
                </div>
              </div>

              <aside className="grid content-start gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Public card preview</p>
                  {changed.length ? (
                    <Badge
                      variant="outline"
                      className="border-maroon/30 bg-maroon-mist text-maroon-deep"
                    >
                      Unsaved
                    </Badge>
                  ) : (
                    <Badge variant="outline">Matches live card</Badge>
                  )}
                </div>
                <PublicCardPreview
                  code={programme.code}
                  title={form.title}
                  summary={form.summary}
                  meta={`${programme.formatLabel}, ${programme.durationLabel}`}
                  image={programme.cardImagePath}
                  certifies={form.certificationEnabled}
                />
                {form.status !== 'published' ? (
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    Not visible on the public site while {STATUS_LABEL[form.status].toLowerCase()}.
                  </p>
                ) : null}
              </aside>
            </div>

            <ProgrammeStructure detail={detail} />
          </div>

          <SheetFooter className="flex-row items-center justify-between gap-2 border-t bg-card px-6 py-4">
            <p className="text-xs text-muted-foreground">
              {changed.length
                ? `${changed.length} unsaved ${changed.length === 1 ? 'change' : 'changes'}`
                : 'No changes'}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!changed.length || update.isPending}>
                {update.isPending ? 'Saving' : 'Save programme'}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function ProgrammeStructure({ detail }: { detail: UseQueryResult<ProgrammeDetail, Error> }) {
  const data = detail.data
  if (detail.isLoading)
    return (
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  if (detail.isError || !data)
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
      >
        The programme structure could not be loaded.
        <Button size="sm" variant="ghost" onClick={() => detail.refetch()}>
          Try again
        </Button>
      </div>
    )
  return (
    <div className="grid gap-4 border-t pt-6 lg:grid-cols-3">
      <section className="grid content-start gap-3 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg">Stage and level structure</h3>
          {data.defaultPath ? (
            <Link
              to="/admin/manage/paths/$pathId"
              params={{ pathId: data.defaultPath.id }}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"
            >
              Edit path <ArrowRight aria-hidden className="size-3" />
            </Link>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          From the default path{data.defaultPath ? `, ${data.defaultPath.name}` : ''}.{' '}
          {data.paths.length} {data.paths.length === 1 ? 'path' : 'paths'} in this programme.
        </p>
        <ol className="grid gap-2">
          {data.structure.map((stage) => (
            <li key={`${stage.level}-${stage.stage}`} className="grid gap-1">
              <p className="text-[11px] font-semibold tracking-wide text-teal-deep">
                Level {stage.level}: {stage.stage}
              </p>
              <ul className="grid gap-0.5 ps-3">
                {stage.items.map((item) => (
                  <li key={item.title} className="text-sm text-ink/80">
                    {item.title}
                    {item.required ? '' : ' (optional)'}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
      <section className="grid content-start gap-3 rounded-xl border p-4">
        <h3 className="font-display text-lg">Course catalogue</h3>
        <ul className="grid gap-2">
          {data.catalogue.map((course) => (
            <li key={course.code} className="flex items-baseline gap-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{course.code}</span>
              <span className="text-ink/80">{course.title}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-2 font-display text-lg">Assessments</h3>
        <ul className="grid gap-1.5 text-sm">
          {data.assessments.map((a) => (
            <li key={a.code} className="flex justify-between gap-2">
              <span className="text-ink/80">
                {a.title} <span className="text-xs text-muted-foreground">{a.version}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {a.passPercent ? `Pass ${a.passPercent}%` : 'Baseline'}
              </span>
            </li>
          ))}
          {data.assignments.map((a) => (
            <li key={a.code} className="flex justify-between gap-2">
              <span className="text-ink/80">{a.title}</span>
              <span className="text-xs text-muted-foreground">Pass {a.passPercent}%</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid content-start gap-3 rounded-xl border p-4">
        <h3 className="font-display text-lg">Completion rules</h3>
        <dl className="grid gap-2">
          {Object.entries(data.completionRules).map(([key, value]) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-3 border-b pb-2 last:border-b-0"
            >
              <dt className="text-sm text-ink/80">{ruleLabel(key)}</dt>
              <dd className="font-display text-lg tabular-nums">{ruleValue(key, value)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Illustrative demo thresholds, not official Qatar Tourism policy.
        </p>
      </section>
    </div>
  )
}
