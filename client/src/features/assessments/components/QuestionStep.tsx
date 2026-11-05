import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { AttemptQuestion } from '../types'
import { competencyIcon } from '../utils/competency-icons'

const LETTERS: Record<string, readonly string[]> = {
  en: ['A', 'B', 'C', 'D', 'E', 'F'],
  ar: ['أ', 'ب', 'ج', 'د', 'هـ', 'و'],
}

/**
 * One question. Single-choice and scenario questions use radio buttons, multiple-choice ones use
 * checkboxes. The answer text keeps the language the attempt was drawn in, so its direction is set
 * from the question rather than the page. A chosen card shows a tick as well as its colour.
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
  const Icon = competencyIcon(question.competency)
  const toggle = (key: string) => {
    if (!multiple) return onChange(question.id, [key])
    onChange(
      question.id,
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key],
    )
  }
  return (
    <fieldset className="flex flex-col gap-6" disabled={disabled}>
      <legend className="flex flex-col gap-3">
        <span className="inline-flex flex-wrap items-center gap-2 text-sm font-medium text-maroon">
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-full bg-maroon-mist text-maroon"
          >
            <Icon className="size-3.5" />
          </span>
          {t('runner.questionOf', { n: index + 1, total })} ·{' '}
          {t(`competency.${question.competency}` as 'competency.discover_needs')}
        </span>
        <span
          lang={question.language}
          dir={dir}
          className="font-display text-2xl leading-snug font-normal text-balance text-ink md:text-[2rem]"
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
                'group flex cursor-pointer items-center gap-4 rounded-xl border border-ink/10 bg-white p-4 shadow-xs transition-[border-color,background-color,box-shadow,transform] duration-200 md:p-5',
                'hover:border-teal/50 hover:shadow-sm motion-safe:hover:-translate-y-px',
                'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/60',
                checked && 'border-teal bg-teal-mist shadow-sm ring-1 ring-teal',
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
                  'grid size-9 shrink-0 place-items-center border text-sm font-semibold transition-colors duration-200',
                  multiple ? 'rounded-lg' : 'rounded-full',
                  checked
                    ? 'border-teal bg-teal text-white'
                    : 'border-ink/10 bg-sand text-teal-deep group-hover:border-teal/40',
                )}
              >
                {checked && multiple ? (
                  <Check className="size-4" />
                ) : (
                  ((LETTERS[question.language] ?? LETTERS.en)?.[i] ?? i + 1)
                )}
              </span>
              <span className="flex-1 text-ink md:text-[1.05rem]">{option.text}</span>
              <span
                aria-hidden
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full border transition-colors duration-200',
                  checked ? 'border-teal bg-teal text-white' : 'border-ink/15 text-transparent',
                )}
              >
                <Check className="size-3.5" />
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
