import { ROLEPLAY_RUBRIC } from '@shared/constants'
import { ROLEPLAY_SCENARIOS } from '@shared/content'
import { useTranslation } from 'react-i18next'
import { SimulatedTag } from '@/components/layout'

const SCENARIO = ROLEPLAY_SCENARIOS[0]

/** Example scores from the brief §9 worked example (16 of 20, shown as 80 of 100). */
const EXAMPLE_SCORES = [4, 3, 3, 3, 3]

/** Practise with AI: the changed-booking scenario and the five-criterion rubric (brief §9). */
export function AiPracticePreview() {
  const { t } = useTranslation('public')
  if (!SCENARIO) return null
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <SimulatedTag label={t('previews.ai.simulated')} />
        <span className="text-muted-foreground text-sm">
          {t('previews.ai.meta', {
            title: t('data.scenario.title'),
            difficulty: t('data.scenario.difficulty'),
            minutes: SCENARIO.estimatedMinutes,
          })}
        </span>
      </div>
      <ol className="grid gap-3" aria-label={t('previews.ai.conversation')}>
        <li className="max-w-[85%] rounded-xl rounded-ss-sm bg-white p-4 text-sm ring-1 ring-ink/5">
          <span className="mb-1 block font-medium text-maroon text-xs">
            {t('previews.ai.visitor')}
          </span>
          {t('data.scenario.opening')}
        </li>
        <li className="ms-auto max-w-[85%] rounded-xl rounded-se-sm bg-teal p-4 text-sm text-white">
          <span className="mb-1 block font-medium text-white/80 text-xs">
            {t('previews.ai.you')}
          </span>
          {t('previews.ai.reply')}
        </li>
        <li className="max-w-[85%] rounded-xl rounded-ss-sm bg-white p-4 text-sm ring-1 ring-ink/5">
          <span className="mb-1 block font-medium text-maroon text-xs">
            {t('previews.ai.visitor')}
          </span>
          {t('data.scenario.followUp')}
        </li>
      </ol>
      <div className="grid gap-3 rounded-xl bg-white p-5 ring-1 ring-ink/5">
        <div className="flex items-baseline justify-between">
          <p className="font-medium">{t('previews.ai.feedback')}</p>
          <p dir="ltr" className="font-display text-2xl text-teal">
            {t('previews.ai.score')}
          </p>
        </div>
        <ul className="grid gap-1.5 text-sm">
          {ROLEPLAY_RUBRIC.map((criterion, i) => (
            <li key={criterion.key} className="flex justify-between gap-4">
              <span>{t(`data.rubric.${criterion.key}`)}</span>
              <span className="text-muted-foreground">
                {t('previews.ai.of', { score: EXAMPLE_SCORES[i] })}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-sm">{t('previews.ai.strength')}</p>
      </div>
    </div>
  )
}
