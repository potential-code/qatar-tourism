import { THRESHOLDS } from '@shared/constants'
import type { ProgrammeDetail } from '../queries/programmes.queries'

type Rules = Record<string, unknown>

function num(rules: Rules, key: string, fallback: number): number {
  const value = rules[key]
  return typeof value === 'number' ? value : fallback
}

/** Completion rules (brief §5, §6). Pass marks come from the programme's editable rules. */
export function CompletionRules({ programme }: { programme: ProgrammeDetail }) {
  const rules = programme.completionRules as Rules
  if (programme.code === 'A') {
    const rows = [
      [
        'Onboarding',
        'Programme enrolment, profile and five-question baseline.',
        'Baseline recorded; Level 1 opens.',
      ],
      [
        'Level 1: Foundation learning',
        'Visitor welcome, clear communication, service recovery, an interactive branching scenario and a formative quiz.',
        `Required units complete and foundation quiz at least ${num(rules, 'foundationQuiz', THRESHOLDS.foundationQuizPass)} percent.`,
      ],
      [
        'Level 1: AI practice',
        'Text or voice scenario with feedback and retry.',
        'One attempt completed; the score is advisory.',
      ],
      [
        'Level 2: Trainer-led application',
        'Choose an eligible in-person or live-online session, RSVP and attend.',
        `Attendance marked and session score at least ${num(rules, 'session', THRESHOLDS.sessionPass)} percent.`,
      ],
      [
        'Level 2: Practical assignment',
        'A visitor-service response plan or a short role-play recording, marked with a rubric.',
        `Assignment at least ${num(rules, 'assignment', THRESHOLDS.assignmentPass)} percent; revisions permitted.`,
      ],
      [
        'Final assessment',
        'Parallel post-assessment with a competency comparison.',
        `At least ${num(rules, 'finalAssessment', THRESHOLDS.finalAssessmentPass)} percent; targeted review and retry available.`,
      ],
      [
        'Certification',
        'The system checks every required condition before issuing.',
        'Watermarked demonstration certificate and a verifiable certificate record.',
      ],
    ]
    return (
      <section
        className="overflow-x-auto rounded-xl bg-white ring-1 ring-ink/5"
        aria-label="Program A completion rules"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable table region must be reachable by keyboard (docs/CONVENTIONS.md)
        tabIndex={0}
      >
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-sand text-start text-muted-foreground text-xs">
            <tr>
              <th scope="col" className="p-4 text-start font-medium">
                Level and stage
              </th>
              <th scope="col" className="p-4 text-start font-medium">
                Activities
              </th>
              <th scope="col" className="p-4 text-start font-medium">
                Unlock or outcome
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([stage, activity, outcome]) => (
              <tr key={stage} className="border-ink/5 border-t align-top">
                <th scope="row" className="p-4 text-start font-medium">
                  {stage}
                </th>
                <td className="p-4 text-muted-foreground">{activity}</td>
                <td className="p-4">{outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )
  }
  if (programme.code === 'B') {
    const review = num(rules, 'reviewSuggestedBelow', THRESHOLDS.programmeBReviewSuggested)
    const items = [
      'Complete all core units in your learning path.',
      'Complete one role-play, in text or voice mode.',
      'Have your short visitor response approved.',
      'Complete the post-assessment.',
    ]
    return (
      <div className="grid gap-4 rounded-xl bg-white p-6 ring-1 ring-ink/5">
        <ol className="grid gap-3">
          {items.map((item, index) => (
            <li key={item} className="flex gap-3 text-sm">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-mist font-medium text-teal-deep text-xs">
                {index + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground text-sm">
          No minimum post score blocks completion. Below {review} percent we suggest a review.
          Practice scores are tracked separately from knowledge assessment scores. Program B issues
          no certificate, including after excellent scores. These are illustrative settings an
          administrator can edit.
        </p>
      </div>
    )
  }
  return (
    <p className="rounded-xl bg-white p-6 text-sm ring-1 ring-ink/5">
      Sample overview only: viewing the preview completes it. Seeded reporting shows how a third
      programme would appear to administrators. There is no certificate.
    </p>
  )
}
