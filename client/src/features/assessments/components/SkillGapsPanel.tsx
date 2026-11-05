import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Route, Target } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { CornerPattern } from '@/components/brand/CornerPattern'
import { spring } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { competencyIcon } from '../utils/competency-icons'

const competencyKey = (key: string) => `competency.${key}` as 'competency.discover_needs'

/**
 * After the baseline: the skill gaps sent to the AI path generator, listed as chips, beside the
 * one call to action of the screen, "Build my learning path" (brief §5 step 2).
 */
export function SkillGapsPanel({
  gaps,
  programme,
}: {
  gaps: readonly string[]
  programme: ProgrammeCode
}) {
  const { t } = useTranslation('assessments')
  const reduce = useReducedMotion()
  return (
    <section
      aria-labelledby="gaps-title"
      className="qt-card-elevated grid overflow-hidden rounded-xl md:grid-cols-[1.35fr_1fr]"
    >
      <div className="relative isolate flex flex-col gap-4 bg-sand-deep/60 p-6 md:p-8">
        <CornerPattern side="b" className="opacity-60" />
        <p className="inline-flex items-center gap-2 text-sm font-medium text-maroon">
          <Target aria-hidden className="size-4" />
          {t('result.gapsEyebrow')}
        </p>
        <h2 id="gaps-title" className="font-display text-2xl font-normal text-ink md:text-3xl">
          {t('result.gapsTitle')}
        </h2>
        {gaps.length > 0 ? (
          <>
            <p className="text-sm text-ink/80">{t('result.gapsLead')}</p>
            <ul className="flex flex-wrap gap-2" aria-label={t('result.gapsTitle')}>
              {gaps.map((g) => {
                const Icon = competencyIcon(g)
                return (
                  <li
                    key={g}
                    className="inline-flex items-center gap-2 rounded-full border border-maroon/20 bg-white py-1.5 ps-1.5 pe-3.5 text-sm font-medium text-maroon-deep shadow-xs"
                  >
                    <span
                      aria-hidden
                      className="grid size-6 place-items-center rounded-full bg-maroon-mist"
                    >
                      <Icon className="size-3.5" />
                    </span>
                    {t(competencyKey(g))}
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-ink/80">{t('result.gapsNone')}</p>
        )}
      </div>
      <div className="qt-grain relative isolate flex flex-col justify-center gap-4 overflow-hidden bg-grad-teal p-6 text-white md:p-8">
        <CornerPattern tone="dark" className="opacity-70" />
        <span aria-hidden className="grid size-11 place-items-center rounded-full bg-white/15">
          <Route className="size-5" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h3 className="font-display text-xl font-normal">{t('result.nextTitle')}</h3>
          <p className="text-sm text-white/85">{t('result.nextBody')}</p>
        </div>
        <motion.div whileTap={reduce ? undefined : { scale: 0.97 }} transition={spring}>
          <Button asChild size="lg" variant="maroon" className="w-full sm:w-auto">
            <Link to="/learner/learning/path" search={{ programme }}>
              {t('result.buildPath')} <ArrowRight aria-hidden className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
