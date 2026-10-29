import { useQuery } from '@tanstack/react-query'
import { PencilLine } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api-error'
import { Field } from '../../hub/components/Field'
import { ManagePage } from '../../hub/components/ManagePage'
import { Panel } from '../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../hub/components/QueryStates'
import { ReasonDialog } from '../../hub/components/ReasonDialog'
import { StatusPill } from '../../hub/components/StatusPill'
import {
  type AssessmentItem,
  adminAssessmentsQuery,
  useUpdatePassMark,
} from '../queries/assessments.queries'
import { QuestionBank } from './QuestionBank'
import { Rubrics } from './Rubrics'

const KIND = { pre: 'Baseline', post: 'Post-assessment', formative: 'Formative' } as const

export function AssessmentsPage() {
  const query = useQuery(adminAssessmentsQuery())
  const [editing, setEditing] = useState<AssessmentItem | null>(null)

  return (
    <ManagePage
      title="Assessment and rubric management"
      description="Assessment versions and pass marks, the question bank and the rubrics trainers and the AI practice use."
    >
      <section className="grid gap-4">
        {query.isPending ? (
          <CardsSkeleton count={3} />
        ) : query.isError ? (
          <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {query.data.items.map((a, i) => (
              <AssessmentCard key={a.id} item={a} index={i} onEdit={() => setEditing(a)} />
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Versions are shown beside every result. Existing attempts keep the version they were taken
          against.
        </p>
      </section>
      <Reveal>
        <Panel
          title="Question bank"
          description="Baseline and parallel post items, one per competency."
        >
          <QuestionBank />
        </Panel>
      </Reveal>
      <Reveal>
        <section className="grid gap-4">
          <h2 className="font-display text-2xl font-normal text-ink">Rubrics and thresholds</h2>
          <Rubrics />
        </section>
      </Reveal>
      <PassMarkDialog item={editing} onClose={() => setEditing(null)} />
    </ManagePage>
  )
}

function AssessmentCard({
  item,
  index,
  onEdit,
}: {
  item: AssessmentItem
  index: number
  onEdit: () => void
}) {
  const reduce = useReducedMotion()
  const passRate =
    item.passPercent !== null && item.attempts
      ? Math.round((item.passed / item.attempts) * 100)
      : null
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="grid gap-5 rounded-xl border bg-card p-6 shadow-xs"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-xs font-medium text-teal tabular-nums">
            {item.code} | Version {item.version}
          </p>
          <h2 className="font-display text-2xl font-normal text-ink">{item.title}</h2>
        </div>
        <StatusPill tone="info">{KIND[item.kind]}</StatusPill>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-muted-foreground">Attempts</dt>
          <dd className="font-display text-2xl tabular-nums">
            {item.attempts.toLocaleString('en-GB')}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Average</dt>
          <dd className="font-display text-2xl tabular-nums">{item.average ?? 'None'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Pass rate</dt>
          <dd className="font-display text-2xl tabular-nums">
            {passRate === null ? 'None' : `${passRate}%`}
          </dd>
        </div>
      </dl>
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm">
          <span className="text-muted-foreground">Pass mark </span>
          <span className="font-medium text-ink">
            {item.passPercent === null ? 'None, records a starting point' : `${item.passPercent}%`}
          </span>
        </p>
        {item.kind !== 'pre' ? (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <PencilLine /> Edit
          </Button>
        ) : (
          <span className="h-8 text-xs leading-8 text-muted-foreground">Fixed</span>
        )}
      </div>
    </motion.article>
  )
}

function PassMarkDialog({ item, onClose }: { item: AssessmentItem | null; onClose: () => void }) {
  const update = useUpdatePassMark(item?.id ?? '')
  const [value, setValue] = useState('')
  const parsed = Number(value)
  const invalid = value === '' || !Number.isInteger(parsed) || parsed < 0 || parsed > 100
  return (
    <ReasonDialog
      open={Boolean(item)}
      onOpenChange={(o) => {
        if (!o) onClose()
        else setValue(String(item?.passPercent ?? ''))
      }}
      title={`Edit pass mark: ${item?.title ?? ''}`}
      description="Applies to new attempts. Past results keep the mark they were scored against; the change is recorded in the audit trail."
      confirmLabel="Save pass mark"
      pending={update.isPending}
      onConfirm={async (reason) => {
        if (invalid) return
        try {
          await update.mutateAsync({ passPercent: parsed, reason })
          toast.success('Pass mark updated', { description: 'Recorded as assessment.update.' })
          onClose()
        } catch (e) {
          toast.error(e instanceof ApiError ? e.message : 'The pass mark could not be saved')
        }
      }}
    >
      <Field
        id="pass-mark"
        label="Pass mark (percent)"
        error={invalid && value !== '' ? 'Enter a whole number from 0 to 100' : null}
      >
        <Input
          id="pass-mark"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32"
        />
      </Field>
    </ReasonDialog>
  )
}
