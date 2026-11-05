import { BarChart3, MessageSquareText, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AssessmentKind } from '../queries/assessments.queries'

/** "How it works": answer the questions, save and resume, then results by competency. */
export function StartSteps({ kind, count }: { kind: AssessmentKind; count: number }) {
  const { t } = useTranslation('assessments')
  const steps = [
    {
      icon: MessageSquareText,
      title:
        kind === 'pre'
          ? t('start.step1TitlePre', { n: count })
          : t('start.step1Title', { n: count }),
      body: t('start.step1Body'),
    },
    { icon: Save, title: t('start.step2Title'), body: t('start.step2Body') },
    {
      icon: BarChart3,
      title: t('start.step3Title'),
      body: kind === 'pre' ? t('start.step3BodyPre') : t('start.step3Body'),
    },
  ]
  return (
    <section aria-labelledby="how-title" className="flex flex-col gap-4">
      <h2 id="how-title" className="font-display text-2xl font-normal text-ink">
        {t('start.howTitle')}
      </h2>
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="qt-card-elevated flex flex-col gap-3 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <span
                aria-hidden
                className="grid size-10 place-items-center rounded-full bg-teal-mist text-teal"
              >
                <s.icon className="size-5" />
              </span>
              <span
                aria-hidden
                className="font-display text-3xl font-light text-teal/40 tabular-nums"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <h3 className="font-medium text-ink">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
