import { THRESHOLDS } from '@shared/constants'
import { cn } from '@/lib/utils'
import type { ProgrammeDetail } from '../queries/programmes.queries'
import { accent } from '../tone'

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
        className="qt-card-elevated overflow-x-auto rounded-[1.5rem]"
        data-reveal="card"
        aria-label="Program A completion rules"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable table region must be reachable by keyboard (docs/CONVENTIONS.md)
        tabIndex={0}
      >
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-grad-teal text-start text-white/85 text-xs uppercase tracking-[0.12em]">
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
            {rows.map(([stage, activity, outcome], index) => (
              <tr
                key={stage}
                className="border-ink/5 border-t align-top transition-colors duration-300 hover:bg-teal-mist/40"
              >
                <th scope="row" className="p-4 text-start font-medium">
                  <span className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', accent(index).bar)}
                    />
                    {stage}
                  </span>
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
      <div className="grid gap-6">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <li
              key={item}
              data-reveal="card"
              className="group qt-card-elevated relative grid content-start gap-4 overflow-hidden rounded-[1.5rem] p-6 text-sm leading-relaxed transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 motion-reduce:hover:transform-none"
            >
              <span
                aria-hidden
                className={cn('absolute inset-x-0 top-0 h-1.5', accent(index).bar)}
              />
              <span
                aria-hidden
                className={cn('font-display font-light text-5xl leading-none', accent(index).icon)}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              {item}
            </li>
          ))}
        </ol>
        <p
          data-reveal
          className="max-w-4xl rounded-2xl bg-white/70 p-5 text-muted-foreground text-sm ring-1 ring-ink/5"
        >
          No minimum post score blocks completion. Below {review} percent we suggest a review.
          Practice scores are tracked separately from knowledge assessment scores. Program B issues
          no certificate, including after excellent scores. These are illustrative settings an
          administrator can edit.
        </p>
      </div>
    )
  }
  return (
    <p data-reveal="card" className="qt-card-elevated rounded-[1.5rem] p-6 text-sm">
      Sample overview only: viewing the preview completes it. Seeded reporting shows how a third
      programme would appear to administrators. There is no certificate.
    </p>
  )
}
