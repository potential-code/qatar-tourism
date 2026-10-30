import { useQuery } from '@tanstack/react-query'
import { Rocket } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DemoSettingsNote } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { ApiError } from '@/lib/api-error'
import { Field } from '../../hub/components/Field'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { Panel } from '../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../hub/components/QueryStates'
import { ReasonDialog } from '../../hub/components/ReasonDialog'
import { StatusPill } from '../../hub/components/StatusPill'
import {
  type RuleConfig,
  type RuleItem,
  rulesQuery,
  usePublishRule,
} from '../queries/assessments.queries'
import {
  FEEDBACK_LABELS,
  KIND_LABELS,
  POLICY_LABELS,
  PREREQUISITES,
  toOptions,
} from '../utils/labels'
import { type Availability, DrawGrid } from './DrawGrid'
import { RulePreview } from './RulePreview'

/** Assessment Builder: the rule for each programme and assessment, with preview and versioned publishing. */
export function AssessmentBuilder() {
  const query = useQuery(rulesQuery())
  const [programme, setProgramme] = useState<'A' | 'B'>('A')
  const [kind, setKind] = useState<'pre' | 'post'>('post')

  if (query.isPending) return <CardsSkeleton count={2} className="grid gap-5 lg:grid-cols-2" />
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
  const current = query.data.items.find((i) => i.programme === programme && i.kind === kind)

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <SegmentedControl
          aria-label="Programme"
          value={programme}
          onValueChange={(v) => v && setProgramme(v as 'A' | 'B')}
        >
          <SegmentedControlItem value="A">Program A</SegmentedControlItem>
          <SegmentedControlItem value="B">Program B</SegmentedControlItem>
        </SegmentedControl>
        <SegmentedControl
          aria-label="Assessment"
          value={kind}
          onValueChange={(v) => v && setKind(v as 'pre' | 'post')}
        >
          <SegmentedControlItem value="pre">Pre</SegmentedControlItem>
          <SegmentedControlItem value="post">Post</SegmentedControlItem>
        </SegmentedControl>
        <DemoSettingsNote />
      </div>
      {current ? (
        <RuleForm
          key={`${current.id}`}
          item={current}
          available={query.data.questionsAvailable as Availability}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No rule is published for this assessment.</p>
      )}
    </div>
  )
}

function RuleForm({ item, available }: { item: RuleItem; available: Availability }) {
  const publish = usePublishRule()
  const [config, setConfig] = useState<RuleConfig>(item.config)
  const [confirming, setConfirming] = useState(false)
  const isPre = item.kind === 'pre'
  const patch = (next: Partial<RuleConfig>) => setConfig((prev) => ({ ...prev, ...next }))
  const total = config.draws.reduce((sum, d) => sum + d.count, 0)
  const numberOrNull = (text: string) => (text.trim() === '' ? null : Number(text))

  const submit = (reason: string) =>
    publish.mutate(
      { config, reason },
      {
        onSuccess: (saved) => {
          toast.success(`${KIND_LABELS[item.kind]} rule version ${saved.version} published`, {
            description: 'New attempts follow it. Attempts already taken keep their snapshot.',
          })
          setConfirming(false)
        },
        onError: (e) => {
          toast.error(e instanceof ApiError ? e.message : 'The rule could not be published')
          setConfirming(false)
        },
      },
    )

  return (
    <div className="grid gap-5">
      <Panel
        title={`${KIND_LABELS[item.kind]}, Program ${item.programme}`}
        description={`Published version ${item.version}. Publishing creates version ${item.version + 1}.`}
        action={<StatusPill tone="good">Version {item.version} live</StatusPill>}
      >
        <div className="grid gap-6">
          <DrawGrid
            draws={config.draws}
            available={available}
            onChange={(draws) => patch({ draws })}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              id="b-pass"
              label="Pass percentage"
              hint={
                isPre ? 'The pre-assessment has no pass gate.' : 'Leave empty for no pass gate.'
              }
            >
              <Input
                id="b-pass"
                type="number"
                min={1}
                max={100}
                disabled={isPre}
                value={config.passPercent ?? ''}
                onChange={(e) => patch({ passPercent: numberOrNull(e.target.value) })}
                className="w-28"
              />
            </Field>
            <Field id="b-attempts" label="Attempt limit">
              <Input
                id="b-attempts"
                type="number"
                min={1}
                max={10}
                value={config.attemptLimit}
                onChange={(e) => patch({ attemptLimit: Number(e.target.value) })}
                className="w-28"
              />
            </Field>
            <Field id="b-time" label="Time limit (minutes)" hint="Leave empty for no time limit.">
              <Input
                id="b-time"
                type="number"
                min={1}
                max={240}
                value={config.timeLimitMinutes ?? ''}
                onChange={(e) => patch({ timeLimitMinutes: numberOrNull(e.target.value) })}
                className="w-28"
              />
            </Field>
            <Field id="b-feedback" label="Feedback release">
              <OptionSelect
                id="b-feedback"
                value={config.feedbackRelease}
                onChange={(v) =>
                  v && patch({ feedbackRelease: v as RuleConfig['feedbackRelease'] })
                }
                options={toOptions(FEEDBACK_LABELS)}
              />
            </Field>
            <Field id="b-policy" label="Score policy">
              <OptionSelect
                id="b-policy"
                value={config.scorePolicy}
                onChange={(v) => v && patch({ scorePolicy: v as RuleConfig['scorePolicy'] })}
                options={toOptions(POLICY_LABELS)}
              />
            </Field>
            <div className="grid content-start gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="b-rq"
                  checked={config.randomiseQuestions}
                  onCheckedChange={(v) => patch({ randomiseQuestions: v })}
                />
                <label htmlFor="b-rq" className="text-sm">
                  Random question selection and order
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="b-ro"
                  checked={config.randomiseOptions}
                  onCheckedChange={(v) => patch({ randomiseOptions: v })}
                />
                <label htmlFor="b-ro" className="text-sm">
                  Random option order
                </label>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-muted/60 p-4 text-sm">
            <p className="font-medium text-ink">Prerequisites</p>
            <p className="mt-1 text-ink/80">{PREREQUISITES[`${item.programme}:${item.kind}`]}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Prerequisites come from the programme gates and learning path rules, so they are shown
              here and changed in Learning path management.
              {item.programme === 'A' && item.kind === 'post'
                ? ' The Program A certificate gate currently checks the 80% demo threshold.'
                : ''}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {total} questions per attempt. Existing attempts are not affected.
          </p>
          <Button onClick={() => setConfirming(true)} disabled={publish.isPending || total === 0}>
            <Rocket /> Publish version {item.version + 1}
          </Button>
        </div>
      </Panel>
      <RulePreview config={config} />
      <ReasonDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Publish ${KIND_LABELS[item.kind]} rule version ${item.version + 1}`}
        description="New attempts follow this rule at once. Learners keep the attempts, snapshots and results they already have."
        confirmLabel="Publish version"
        pending={publish.isPending}
        onConfirm={submit}
      />
    </div>
  )
}
