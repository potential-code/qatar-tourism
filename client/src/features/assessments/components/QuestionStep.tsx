import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { AttemptQuestion } from '../types'

const LETTERS: Record<string, readonly string[]> = {
  en: ['A', 'B', 'C', 'D', 'E', 'F'],
  ar: ['أ', 'ب', 'ج', 'د', 'هـ', 'و'],
}

/**
 * One question. Single-choice and scenario questions use radio buttons, multiple-choice ones use
 * checkboxes. The answer text keeps the language the attempt was drawn in, so its direction is set
 * from the question rather than the page.
 */
export function QuestionStep({
  question,
  index,
  total,
  selected,
  disabled,
  onChange,
}: {
  question: AttemptQuestion
  index: number
  total: number
  selected: readonly string[]
  disabled: boolean
  onChange: (questionId: string, keys: string[]) => void
}) {
  const { t } = useTranslation('assessments')
  const multiple = question.type === 'multiple'
  const dir = question.language === 'ar' ? 'rtl' : 'ltr'
  const toggle = (key: string) => {
    if (!multiple) return onChange(question.id, [key])
    onChange(
      question.id,
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key],
    )
  }
  return (
    <fieldset className="flex flex-col gap-5" disabled={disabled}>
      <legend className="flex flex-col gap-2">
        <span className="text-sm font-medium text-maroon">
          {t('runner.questionOf', { n: index + 1, total })} ·{' '}
          {t(`competency.${question.competency}` as 'competency.discover_needs')}
        </span>
        <span
          lang={question.language}
          dir={dir}
          className="font-display text-2xl leading-snug text-ink md:text-3xl"
        >
          {question.prompt}
        </span>
        <span className="text-sm text-muted-foreground">
          {multiple ? t('runner.multiple') : t('runner.single')}
          {question.type === 'scenario' ? ` · ${t('runner.scenario')}` : ''}
        </span>
      </legend>
      <div className="flex flex-col gap-3" lang={question.language} dir={dir}>
        {question.options.map((option, i) => {
          const checked = selected.includes(option.key)
          return (
            <label
              key={option.key}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-xl border bg-white p-4 transition-colors duration-200 hover:border-teal/50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring',
                checked && 'border-teal bg-teal-mist shadow-sm',
                disabled && 'cursor-not-allowed opacity-70',
              )}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={`q-${question.id}`}
                value={option.key}
                checked={checked}
                onChange={() => toggle(option.key)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'grid size-8 shrink-0 place-items-center border text-sm font-semibold',
                  multiple ? 'rounded-md' : 'rounded-full',
                  checked ? 'border-teal bg-teal text-white' : 'bg-sand text-teal-deep',
                )}
              >
                {checked && multiple
                  ? '✓'
                  : ((LETTERS[question.language] ?? LETTERS.en)?.[i] ?? i + 1)}
              </span>
              <span className="text-ink">{option.text}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
