import type { Competency } from '@shared/constants'
import { cn } from '@/lib/utils'
import type { OpenAttempt } from '../types'

type Question = OpenAttempt['questions'][number]

/** One scenario question; answer order is shuffled by the server per attempt (brief §8). */
export function QuestionStep({
  question,
  index,
  total,
  selected,
  onSelect,
}: {
  question: Question
  index: number
  total: number
  selected: string | undefined
  onSelect: (competency: Competency, option: 'A' | 'B' | 'C') => void
}) {
  const name = `q-${question.competency}`
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="flex flex-col gap-2">
        <span className="text-sm font-medium text-maroon">
          Question {index + 1} of {total} · {question.competencyLabel}
        </span>
        <span className="font-display text-2xl leading-snug text-ink md:text-3xl">
          {question.prompt}
        </span>
      </legend>
      <div className="flex flex-col gap-3">
        {question.options.map((option, i) => (
          <label
            key={option.key}
            className={cn(
              'flex cursor-pointer items-center gap-4 rounded-xl border bg-white p-4 transition-all duration-200 hover:border-teal/50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring',
              selected === option.key && 'border-teal bg-teal-mist shadow-sm',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.key}
              checked={selected === option.key}
              onChange={() =>
                onSelect(question.competency as Competency, option.key as 'A' | 'B' | 'C')
              }
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold',
                selected === option.key
                  ? 'border-teal bg-teal text-white'
                  : 'bg-sand text-teal-deep',
              )}
            >
              {String.fromCharCode(65 + i)}
            </span>
            <span className="text-ink">{option.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
