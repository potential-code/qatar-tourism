import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { RenewalView } from '@/services/credentials/renewal.service'
import { RENEWAL_CHECK_QUESTIONS } from '@/services/credentials/renewal-check'

/**
 * The renewal knowledge check: five short scenario questions authored in English and Arabic
 * (`renewal.check.*`). The pass mark is a demo setting shown with the questions.
 */
export function RenewalCheck({
  view,
  pending,
  onSubmit,
  onCancel,
}: {
  view: RenewalView
  pending: boolean
  onSubmit: (answers: Record<string, string>) => void
  onCancel: () => void
}) {
  const { t } = useTranslation('record')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState(false)
  const missing = RENEWAL_CHECK_QUESTIONS.filter((q) => !answers[q.id]).length

  return (
    <form
      aria-label={t('renewal.check.title')}
      className="grid gap-5 rounded-xl border bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (missing === 0) onSubmit(answers)
      }}
    >
      <div className="grid gap-1">
        <h3 className="font-display text-lg text-ink">{t('renewal.check.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('renewal.check.intro', { percent: view.check.passPercent })}
        </p>
      </div>
      {RENEWAL_CHECK_QUESTIONS.map((question, index) => (
        <fieldset key={question.id} className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">
            {index + 1}. {t(`renewal.check.${question.id as 'q1'}.prompt`)}
          </legend>
          <RadioGroup
            value={answers[question.id] ?? ''}
            onValueChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
            aria-label={t(`renewal.check.${question.id as 'q1'}.prompt`)}
          >
            {question.options.map((option) => {
              const id = `${question.id}-${option}`
              return (
                <div key={option} className="flex items-start gap-2">
                  <RadioGroupItem id={id} value={option} className="mt-0.5" />
                  <Label htmlFor={id} className="leading-snug font-normal">
                    {t(`renewal.check.${question.id as 'q1'}.${option as 'a'}`)}
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
        </fieldset>
      ))}
      {touched && missing > 0 ? (
        <p role="alert" className="text-sm text-destructive">
          {t('renewal.check.unanswered', { n: missing })}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t('common.submitting') : t('renewal.check.submit')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
