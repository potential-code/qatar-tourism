import { useQuery } from '@tanstack/react-query'
import { CircleCheck, Pencil, Plus, Rocket } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiError } from '@/lib/api-error'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { StatusPill } from '../../hub/components/StatusPill'
import { TableFrame } from '../../hub/components/TableFrame'
import {
  type QuestionListItem,
  questionsQuery,
  usePublishQuestion,
} from '../queries/assessments.queries'
import {
  COMPETENCY_LABELS,
  DIFFICULTY_LABELS,
  LANGUAGE_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  toOptions,
} from '../utils/labels'
import { QuestionEditor } from './QuestionEditor'

type Filters = {
  competency: string | null
  difficulty: string | null
  language: string | null
  status: string | null
}

const EMPTY: Filters = { competency: null, difficulty: null, language: null, status: null }

/** Question Banks: every version of every variant, filterable. Editing a published item makes the next version. */
export function QuestionBank() {
  const query = useQuery(questionsQuery())
  const publish = usePublishQuestion()
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [allVersions, setAllVersions] = useState(false)
  const [editing, setEditing] = useState<QuestionListItem | 'new' | null>(null)

  const rows = useMemo(
    () =>
      (query.data?.items ?? []).filter(
        (q) =>
          (allVersions || q.isLatest) &&
          (!filters.competency || q.competency === filters.competency) &&
          (!filters.difficulty || q.difficulty === filters.difficulty) &&
          (!filters.language || q.language === filters.language) &&
          (!filters.status || q.status === filters.status),
      ),
    [query.data, filters, allVersions],
  )

  const set = (key: keyof Filters) => (value: string | null) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const publishRow = (row: QuestionListItem) =>
    publish.mutate(row.id, {
      onSuccess: () =>
        toast.success(`${row.questionId} version ${row.version} published`, {
          description: 'New attempts can draw this version. Past attempts keep theirs.',
        }),
      onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not publish'),
    })

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Competency"
          value={filters.competency}
          onChange={set('competency')}
          options={toOptions(COMPETENCY_LABELS)}
        />
        <FilterSelect
          label="Difficulty"
          value={filters.difficulty}
          onChange={set('difficulty')}
          options={toOptions(DIFFICULTY_LABELS)}
        />
        <FilterSelect
          label="Language"
          value={filters.language}
          onChange={set('language')}
          options={toOptions(LANGUAGE_LABELS)}
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={set('status')}
          options={toOptions(STATUS_LABELS)}
        />
        <div className="flex items-center gap-2 pb-2">
          <Switch id="all-versions" checked={allVersions} onCheckedChange={setAllVersions} />
          <Label htmlFor="all-versions">Show earlier versions</Label>
        </div>
        <Button className="ms-auto" onClick={() => setEditing('new')}>
          <Plus /> New question
        </Button>
      </div>

      {query.data ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {query.data.summary.shared} shared questions, {query.data.summary.published} published
          variants in use, {query.data.summary.drafts} drafts. Showing {rows.length}. English and
          Arabic variants share a set ID.
        </p>
      ) : null}

      {query.isPending ? (
        <TableSkeleton rows={8} cols={7} />
      ) : query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <TableFrame label="Question bank">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Competency</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-end">Points</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No questions match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="whitespace-nowrap">
                      <p className="font-medium text-ink">{q.questionId}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.sharedId} · {LANGUAGE_LABELS[q.language]}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p
                        lang={q.language}
                        dir={q.language === 'ar' ? 'rtl' : 'ltr'}
                        className="line-clamp-2 text-sm"
                      >
                        {q.prompt}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <CircleCheck aria-hidden className="size-3 text-success" />
                        Correct: {q.correct.join(', ')}
                        {q.attemptsUsing > 0 ? ` · used in ${q.attemptsUsing} attempts` : ''}
                      </p>
                    </TableCell>
                    <TableCell>{COMPETENCY_LABELS[q.competency]}</TableCell>
                    <TableCell>{DIFFICULTY_LABELS[q.difficulty]}</TableCell>
                    <TableCell>{TYPE_LABELS[q.type]}</TableCell>
                    <TableCell className="text-end tabular-nums">{q.points}</TableCell>
                    <TableCell className="tabular-nums">v{q.version}</TableCell>
                    <TableCell>
                      <StatusPill tone={q.status === 'published' ? 'good' : 'warn'}>
                        {STATUS_LABELS[q.status]}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-end whitespace-nowrap">
                      {q.status === 'draft' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={publish.isPending}
                          onClick={() => publishRow(q)}
                        >
                          <Rocket /> Publish
                        </Button>
                      ) : null}{' '}
                      {q.isLatest ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(q)}
                          aria-label={`Edit ${q.questionId}`}
                        >
                          <Pencil /> Edit
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableFrame>
      )}
      <QuestionEditor target={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <OptionSelect
        value={value}
        onChange={onChange}
        options={options}
        allowNone
        noneLabel={`All`}
        placeholder="All"
        ariaLabel={label}
        className="h-9 w-40 rounded-lg bg-white"
      />
    </div>
  )
}
