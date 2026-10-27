import {
  ASSIGNMENT_RUBRIC,
  ROLEPLAY_RUBRIC,
  ROLEPLAY_SCORING,
  SESSION_RUBRIC,
  THRESHOLDS,
} from '@shared/constants'
import { Info } from 'lucide-react'
import { Panel } from '../../hub/components/Panel'

const THRESHOLD_LABELS: Record<keyof typeof THRESHOLDS, string> = {
  foundationQuizPass: 'Program A foundation quiz pass mark',
  sessionPass: 'Trainer-led session pass mark (of 100)',
  assignmentPass: 'Practical assignment pass mark',
  finalAssessmentPass: 'Program A final assessment pass mark',
  programmeBReviewSuggested: 'Program B review suggested below',
  videoCompletePercent: 'C01 video counts as watched at',
  moduleQuizPass: 'C04 module quiz minimum',
  selfServiceChangeHours: 'Self-service reschedule closes (hours before)',
  activeLearnerDays: 'Active learner window (days)',
  inactiveLearnerDays: 'Inactive learner flag (days)',
  markingOverdueDays: 'Marking overdue after (days)',
}

function Weights({ rows, max }: { rows: readonly { label: string; max: number }[]; max: number }) {
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r.label} className="grid gap-1">
          <div className="flex justify-between text-sm">
            <span className="text-ink">{r.label}</span>
            <span className="tabular-nums text-muted-foreground">{r.max} points</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-teal-mist">
            <div
              className="h-full rounded-full bg-teal"
              style={{ width: `${(r.max / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Scoring rubrics and thresholds (brief §9, §10), labelled as illustrative demo defaults. */
export function Rubrics() {
  return (
    <div className="grid gap-6">
      <p className="flex items-start gap-2 rounded-xl border border-maroon/15 bg-maroon-mist px-4 py-3 text-sm text-maroon-deep">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Rubrics and thresholds are illustrative demo defaults, not official Qatar Tourism policy.
      </p>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          title="Session rubric"
          description="Trainer-scored after a session. Pass at 70 of 100."
        >
          <Weights rows={SESSION_RUBRIC} max={30} />
        </Panel>
        <Panel
          title="Practical assignment"
          description="Four criteria, 100 points. Revisions are allowed."
        >
          <Weights rows={ASSIGNMENT_RUBRIC} max={25} />
        </Panel>
        <Panel
          title="AI practice rubric"
          description={`Five criteria scored 0 to ${ROLEPLAY_SCORING.maxPerCriterion}, total out of ${ROLEPLAY_SCORING.maxTotal}, shown out of 100.`}
        >
          <Weights
            rows={ROLEPLAY_RUBRIC.map((r) => ({
              label: r.label,
              max: ROLEPLAY_SCORING.maxPerCriterion,
            }))}
            max={4}
          />
        </Panel>
      </div>
      <Panel title="Thresholds">
        <dl className="grid gap-x-10 gap-y-3 md:grid-cols-2">
          {(Object.keys(THRESHOLDS) as (keyof typeof THRESHOLDS)[]).map((key) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2 text-sm"
            >
              <dt className="text-muted-foreground">{THRESHOLD_LABELS[key]}</dt>
              <dd className="font-display text-lg text-ink tabular-nums">{THRESHOLDS[key]}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  )
}
