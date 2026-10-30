import { Link } from '@tanstack/react-router'
import { MessageSquareQuote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CornerPattern } from '@/components/brand/CornerPattern'
import { PersonAvatar } from '@/components/data/PersonAvatar'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import type { Journey } from '@/features/learning/types'
import { tr } from '@/i18n/localised'
import { qatarDate } from '@/lib/format/qatar-time'

/** Trainer feedback on assignments and sessions (brief §5 dashboard content). */
export function FeedbackCard({ journey }: { journey: Journey }) {
  const { t, i18n } = useTranslation('learner')
  const latest = journey.feedback.slice(0, 2)
  const programme = journey.enrolment.programme
  return (
    <section
      aria-labelledby="feedback-title"
      className="relative isolate overflow-hidden flex flex-col gap-5 rounded-xl border bg-gradient-to-br from-white to-gold-soft/60 p-6"
    >
      <CornerPattern side="a" />
      <h2 id="feedback-title" className="font-display text-2xl font-normal text-ink">
        {t('home.feedback.title')}
      </h2>
      {latest.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          size="sm"
          title={t('home.feedback.emptyTitle')}
          description={programme === 'A' ? t('home.feedback.emptyA') : t('home.feedback.emptyB')}
          action={
            <Link
              to={'/learner/assignments' as never}
              search={{ programme } as never}
              className="text-sm font-medium text-teal hover:underline"
            >
              {t('home.feedback.goAssignments')}
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {latest.map((item) => (
            <li key={`${item.source}-${item.at}`} className="flex gap-3">
              <PersonAvatar name={item.trainerName} src={item.trainerImage} tone="maroon" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-ink">{item.trainerName}</p>
                  <Badge
                    variant="outline"
                    className={
                      item.status === 'approved'
                        ? 'border-teal/30 text-teal-deep'
                        : 'border-maroon/30 text-maroon-deep'
                    }
                  >
                    {t('home.feedback.badge', {
                      status:
                        item.status === 'approved'
                          ? t('home.feedback.approved')
                          : t('home.feedback.revision'),
                      score: item.score,
                    })}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tr(item.title, i18n.language)}, {qatarDate(item.at)}
                </p>
                <blockquote className="text-sm leading-relaxed text-ink/85">
                  “{item.text}”
                </blockquote>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
