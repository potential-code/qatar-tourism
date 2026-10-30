import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CornerPattern } from '@/components/brand/CornerPattern'
import type { Journey } from '@/features/learning/types'
import { CompetencyChart } from '@/features/progress/components/CompetencyChart'

/** Competency chart on the dashboard (brief §5). */
export function CompetencyCard({ journey }: { journey: Journey }) {
  const { t } = useTranslation('learner')
  const programme = journey.enrolment.programme
  return (
    <section
      aria-labelledby="competency-title"
      className="relative isolate overflow-hidden flex flex-col gap-5 rounded-xl border bg-gradient-to-br from-white to-sky-mist p-6"
    >
      <CornerPattern side="b" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="competency-title" className="font-display text-2xl font-normal text-ink">
            {t('home.competency.title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('home.competency.subtitle')}</p>
        </div>
        <Link
          to="/learner/progress"
          search={{ programme }}
          className="text-sm font-medium text-teal hover:underline"
        >
          {t('home.competency.fullProgress')}
        </Link>
      </div>
      <CompetencyChart
        data={journey.competencies}
        postLabel={programme === 'A' ? t('home.final') : t('home.post')}
        showFoundation={programme === 'A'}
      />
    </section>
  )
}
