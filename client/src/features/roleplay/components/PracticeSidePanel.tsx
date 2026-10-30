import { ROLEPLAY_RUBRIC } from '@shared/constants'
import { CheckCircle2, RotateCcw, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { tr } from '@/i18n/localised'
import '../utils/arabic-copy'

/** Goal and the five things the feedback looks at, beside the conversation. */
export function PracticeSidePanel({
  objective,
  onRestart,
}: {
  objective: string
  onRestart: () => void
}) {
  const { t, i18n } = useTranslation('learner')
  return (
    <aside className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-xs">
      <div className="grid gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-teal">
          <Target aria-hidden className="size-4" /> {t('roleplay.side.goal')}
        </h2>
        <p className="text-[15px] leading-relaxed text-ink">{tr(objective, i18n.language)}</p>
      </div>
      <div className="grid gap-2">
        <h2 className="text-sm font-medium text-ink">{t('roleplay.side.looksAt')}</h2>
        <ul className="grid gap-2">
          {ROLEPLAY_RUBRIC.map((criterion) => (
            <li
              key={criterion.key}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-soft" />
              {tr(criterion.label, i18n.language)}
            </li>
          ))}
        </ul>
      </div>
      <Button variant="ghost" size="sm" className="self-start" onClick={onRestart}>
        <RotateCcw aria-hidden /> {t('roleplay.side.startOver')}
      </Button>
    </aside>
  )
}
