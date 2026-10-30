import { THRESHOLDS } from '@shared/constants'
import { useTranslation } from 'react-i18next'
import { tr } from '@/features/public-site/utils/translate'
import { cn } from '@/lib/utils'
import type { ProgrammeDetail } from '../queries/programmes.queries'
import { accent } from '../tone'

type Rules = Record<string, unknown>

function num(rules: Rules, key: string, fallback: number): number {
  const value = rules[key]
  return typeof value === 'number' ? value : fallback
}

const A_ROWS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'] as const
const B_ITEMS = ['b1', 'b2', 'b3', 'b4'] as const

/** Completion rules (brief §5, §6). Pass marks come from the programme's editable rules. */
export function CompletionRules({ programme }: { programme: ProgrammeDetail }) {
  const { t } = useTranslation('public')
  const rules = programme.completionRules as Rules
  if (programme.code === 'A') {
    /** Pass marks that the administrator can change, by row. */
    const marks: Record<string, number> = {
      a2: num(rules, 'foundationQuiz', THRESHOLDS.foundationQuizPass),
      a4: num(rules, 'session', THRESHOLDS.sessionPass),
      a5: num(rules, 'assignment', THRESHOLDS.assignmentPass),
      a6: num(rules, 'finalAssessment', THRESHOLDS.finalAssessmentPass),
    }
    return (
      <section
        className="qt-card-elevated overflow-x-auto rounded-[1.5rem]"
        data-reveal="card"
        aria-label={t('rules.aria')}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable table region must be reachable by keyboard (docs/CONVENTIONS.md)
        tabIndex={0}
      >
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-grad-teal text-start text-white/85 text-xs uppercase tracking-[0.12em] rtl:tracking-normal">
            <tr>
              <th scope="col" className="p-4 text-start font-medium">
                {t('rules.stageCol')}
              </th>
              <th scope="col" className="p-4 text-start font-medium">
                {t('rules.activitiesCol')}
              </th>
              <th scope="col" className="p-4 text-start font-medium">
                {t('rules.outcomeCol')}
              </th>
            </tr>
          </thead>
          <tbody>
            {A_ROWS.map((row, index) => (
              <tr
                key={row}
                className="border-ink/5 border-t align-top transition-colors duration-300 hover:bg-teal-mist/40"
              >
                <th scope="row" className="p-4 text-start font-medium">
                  <span className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', accent(index).bar)}
                    />
                    {tr(t, `rules.${row}Stage`)}
                  </span>
                </th>
                <td className="p-4 text-muted-foreground">{tr(t, `rules.${row}Activity`)}</td>
                <td className="p-4">{tr(t, `rules.${row}Outcome`, { n: marks[row] })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )
  }
  if (programme.code === 'B') {
    const review = num(rules, 'reviewSuggestedBelow', THRESHOLDS.programmeBReviewSuggested)
    return (
      <div className="grid gap-6">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {B_ITEMS.map((item, index) => (
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
              {tr(t, `rules.${item}`)}
            </li>
          ))}
        </ol>
        <p
          data-reveal
          className="max-w-4xl rounded-2xl bg-white/70 p-5 text-muted-foreground text-sm ring-1 ring-ink/5"
        >
          {t('rules.bNote', { n: review })}
        </p>
      </div>
    )
  }
  return (
    <p data-reveal="card" className="qt-card-elevated rounded-[1.5rem] p-6 text-sm">
      {t('rules.c')}
    </p>
  )
}
