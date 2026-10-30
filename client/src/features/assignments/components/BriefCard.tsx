import { ScrollText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { tr } from '@/i18n/localised'
import type { LearnerAssignment } from '../types'

/** The assignment brief, verbatim from the brief (§6 / §7), with its rules. */
export function BriefCard({ item }: { item: LearnerAssignment }) {
  const { t, i18n } = useTranslation('learner')
  const { assignment } = item
  return (
    <section
      aria-labelledby="brief-heading"
      className="grid gap-4 rounded-xl bg-teal-deep p-6 text-white shadow-sm"
    >
      <h2 id="brief-heading" className="flex items-center gap-2 text-sm font-medium text-white/80">
        <ScrollText aria-hidden className="size-4" /> {t('assignments.brief.title')}
      </h2>
      <p className="font-display text-xl leading-snug font-light md:text-2xl">
        {tr(assignment.brief, i18n.language)}
      </p>
      <dl className="grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-white/65">{t('assignments.brief.length')}</dt>
          <dd>
            {t(
              assignment.allowsUpload
                ? 'assignments.brief.lengthWordsFile'
                : 'assignments.brief.lengthWords',
              { min: assignment.wordMin, max: assignment.wordMax },
            )}
          </dd>
        </div>
        <div>
          <dt className="text-white/65">{t('assignments.brief.passMark')}</dt>
          <dd>{assignment.passPercent}/100</dd>
        </div>
        <div>
          <dt className="text-white/65">{t('assignments.brief.revisions')}</dt>
          <dd>{t('assignments.brief.permitted')}</dd>
        </div>
      </dl>
    </section>
  )
}
