import { useQuery } from '@tanstack/react-query'
import { Eye, Timer } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { Pager } from '../../hub/components/Pager'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { StatusPill, type Tone } from '../../hub/components/StatusPill'
import { TableFrame } from '../../hub/components/TableFrame'
import { type AttemptFilter, attemptsQuery } from '../queries/assessments.queries'
import { instant, KIND_LABELS, LANGUAGE_LABELS, toOptions } from '../utils/labels'
import { AttemptDetailSheet } from './AttemptDetailSheet'

const OUTCOMES: Record<string, { label: string; tone: Tone }> = {
  passed: { label: 'Passed', tone: 'good' },
  not_passed: { label: 'Not passed', tone: 'bad' },
  in_progress: { label: 'In progress', tone: 'warn' },
  baseline: { label: 'Baseline recorded', tone: 'info' },
}

/** Attempts: every Pre and Post attempt, with its outcome, language and rule version. */
export function AttemptsTab() {
  const [filter, setFilter] = useState<AttemptFilter>({ page: 1, pageSize: 25 })
  const [openId, setOpenId] = useState<string | null>(null)
  const query = useQuery(attemptsQuery(filter))
  const patch = (next: Partial<AttemptFilter>) =>
    setFilter((prev) => ({ ...prev, page: 1, ...next }))

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label htmlFor="attempt-search" className="text-xs text-muted-foreground">
            Search learner
          </Label>
          <Input
            id="attempt-search"
            placeholder="Name or ID, for example LRN-0042"
            value={filter.search ?? ''}
            onChange={(e) => patch({ search: e.target.value || undefined })}
            className="h-9 w-64"
          />
        </div>
        <Select
          label="Programme"
          value={filter.programme ?? null}
          onChange={(v) => patch({ programme: (v as AttemptFilter['programme']) ?? undefined })}
          options={[
            { value: 'A', label: 'Program A' },
            { value: 'B', label: 'Program B' },
          ]}
        />
        <Select
          label="Assessment"
          value={filter.kind ?? null}
          onChange={(v) => patch({ kind: (v as AttemptFilter['kind']) ?? undefined })}
          options={toOptions(KIND_LABELS)}
        />
        <Select
          label="Outcome"
          value={filter.outcome ?? null}
          onChange={(v) => patch({ outcome: (v as AttemptFilter['outcome']) ?? undefined })}
          options={Object.entries(OUTCOMES).map(([value, o]) => ({ value, label: o.label }))}
        />
        <Select
          label="Language"
          value={filter.language ?? null}
          onChange={(v) => patch({ language: (v as AttemptFilter['language']) ?? undefined })}
          options={toOptions(LANGUAGE_LABELS)}
        />
      </div>

      {query.isPending ? (
        <TableSkeleton rows={8} cols={7} />
      ) : query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <TableFrame label="Assessment attempts">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead className="text-end">Attempt</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead className="text-end">Score</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-end">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No attempts match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  query.data.items.map((a) => {
                    const outcome = OUTCOMES[a.outcome]
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap">
                          <p className="font-medium text-ink">{a.learnerName}</p>
                          <p className="text-xs text-muted-foreground">{a.displayId}</p>
                        </TableCell>
                        <TableCell>{a.programme}</TableCell>
                        <TableCell>{a.kind === 'pre' ? 'Pre' : 'Post'}</TableCell>
                        <TableCell className="text-end tabular-nums">{a.attemptNo}</TableCell>
                        <TableCell>{LANGUAGE_LABELS[a.language]}</TableCell>
                        <TableCell className="text-end tabular-nums">
                          {a.score === null ? 'None' : `${a.score}%`}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <StatusPill tone={outcome?.tone ?? 'neutral'}>
                              {outcome?.label}
                            </StatusPill>
                            {a.autoSubmitted ? (
                              <StatusPill tone="warn">
                                <Timer aria-hidden className="size-3" /> Timed out
                              </StatusPill>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {instant(a.submittedAt)}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setOpenId(a.id)}
                            aria-label={`View attempt ${a.attemptNo} for ${a.learnerName}`}
                          >
                            <Eye /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableFrame>
          <Pager
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            onPage={(page) => setFilter((prev) => ({ ...prev, page }))}
            onPageSize={(pageSize) => setFilter((prev) => ({ ...prev, page: 1, pageSize }))}
            noun="attempts"
          />
        </div>
      )}
      <AttemptDetailSheet attemptId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

function Select({
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
        noneLabel="All"
        placeholder="All"
        ariaLabel={label}
        className="h-9 w-40 rounded-lg bg-white"
      />
    </div>
  )
}
