import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { ArrowRight } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import type { Overview } from '../../queries/analytics.queries'
import { count, signed } from '../../utils/format'
import { GroupedBarChart } from '../charts/GroupedBarChart'
import { PanelCard } from '../PanelCard'

/**
 * Brief §12 learning improvement: paired pre/post with sample size, programme and assessment
 * version, a competency breakdown and the percentage-point gain.
 */
export function ImprovementPanel({ data, onOpen }: { data: Overview; onOpen: () => void }) {
  const { overall, byProgramme, competencies } = data.improvement
  return (
    <PanelCard
      title="Learning improvement"
      description="Paired pre and post assessment scores for the same enrolment."
      info={{
        label: data.definitions.improvement.label,
        definition: data.definitions.improvement.definition,
      }}
      className="col-span-7"
    >
      {overall.n === 0 ? (
        <EmptyState
          size="sm"
          title="No paired scores in this cohort"
          description="Pre and post pairs exist once learners reach the post-assessment. Widen the filters to compare."
        />
      ) : (
        <>
          <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-3">
            <div className="rounded-xl bg-maroon-mist/70 p-4">
              <p className="text-xs text-maroon-deep/80">Average gain, all paired records</p>
              <p className="mt-1 font-display text-4xl leading-none font-light text-maroon-deep tabular-nums">
                {signed(overall.gain)}
                <span className="ms-1 text-base">pp</span>
              </p>
              <p className="mt-2 text-xs text-maroon-deep/80">
                n = {count(overall.n)} · version {overall.versions.join(', ')}
              </p>
            </div>
            {byProgramme.map((p) => (
              <div key={p.programme} className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">{PROGRAMME_LABELS[p.programme]}</p>
                <p className="mt-1 flex items-center gap-2 font-display text-2xl tabular-nums text-ink">
                  {p.pre}
                  <ArrowRight className="size-4 text-muted-foreground" aria-label="to" />
                  {p.post}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-teal-deep">{signed(p.gain)} pp</span> · n ={' '}
                  {count(p.n)} · {p.versions.join(', ')}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 mb-1 text-xs font-medium text-muted-foreground">
            Competency breakdown, average percent correct (n = {count(overall.n)})
          </p>
          <GroupedBarChart
            data={competencies.map((c) => ({ label: c.label, pre: c.pre, post: c.post }))}
            series={[
              { key: 'pre', label: 'Pre' },
              { key: 'post', label: 'Post' },
            ]}
            height={230}
          />
          <p className="sr-only">
            {competencies
              .map((c) => `${c.label}: pre ${c.pre}, post ${c.post}, gain ${c.gain} points.`)
              .join(' ')}
          </p>
          <button
            type="button"
            onClick={onOpen}
            className="mt-3 self-start text-sm font-medium text-teal underline-offset-4 hover:underline"
          >
            Open Assessments and improvement report
          </button>
        </>
      )}
    </PanelCard>
  )
}
