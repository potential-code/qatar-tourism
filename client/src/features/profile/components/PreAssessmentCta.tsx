import { Link } from '@tanstack/react-router'
import { ArrowRight, BadgeCheck, ListChecks, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CornerPattern } from '@/components/brand'
import { Reveal } from '@/components/motion'
import { Button } from '@/components/ui/button'

const FACTS = [
  { key: 'fiveQuestions', icon: ListChecks },
  { key: 'noPassMark', icon: BadgeCheck },
  { key: 'resume', icon: Save },
] as const

/**
 * The page's one primary action: Start pre-assessment, on the deep-teal ground, with the brief's
 * framing that the baseline identifies useful learning and is not an entry barrier.
 */
export function PreAssessmentCta() {
  const { t } = useTranslation('learner')
  return (
    <Reveal className="qt-grain relative isolate grid content-between gap-7 overflow-hidden rounded-xl bg-grad-night p-7 text-white shadow-[var(--qt-shadow-lg)] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-end md:gap-10 md:p-9 lg:grid-cols-1 lg:items-stretch lg:gap-6 lg:p-8">
      <CornerPattern side="a" tone="dark" />
      <div
        aria-hidden
        className="absolute -end-24 -bottom-32 -z-10 size-[380px] qt-glow text-rose/25"
      />
      <div className="grid gap-4">
        <h2 className="font-display font-light text-3xl leading-tight">
          {t('profile.welcome.nextTitle')}
        </h2>
        <p className="max-w-xl text-white/85 leading-relaxed">{t('profile.welcome.nextBody')}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button asChild size="lg" variant="maroon" className="h-14 w-full px-8 text-base">
          <Link
            to="/learner/assessments/$kind"
            params={{ kind: 'pre' }}
            search={{ programme: 'B' }}
          >
            {t('profile.welcome.startPre')}
            <ArrowRight aria-hidden className="rtl:-scale-x-100" />
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="ghost"
          className="text-white hover:bg-white/10 hover:text-white"
        >
          <Link to={'/learner/learning' as never}>{t('profile.welcome.goLearning')}</Link>
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2 border-white/15 border-t pt-5 md:col-span-2 lg:col-span-1">
        {FACTS.map(({ key, icon: Icon }) => (
          <li
            key={key}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm text-white ring-1 ring-white/20"
          >
            <Icon aria-hidden className="size-4 text-gold" />
            {t(`profile.onboarding.${key}`)}
          </li>
        ))}
      </ul>
    </Reveal>
  )
}
