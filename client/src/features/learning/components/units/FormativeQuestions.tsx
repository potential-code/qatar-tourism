import type { ProgrammeCode } from '@shared/constants'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useFormativeAnswer } from '../../queries/learning.queries'
import type { UnitContent } from '../../types'

type Question = Extract<UnitContent, { kind: 'video_questions' }>['questions'][number]

/** C03's three formative questions (brief §7). Graded by the server; retry until correct. */
export function FormativeQuestions({
  questions,
  programme,
}: {
  questions: readonly Question[]
  programme: ProgrammeCode
}) {
  const correct = questions.filter((q) => q.answered?.correct).length
  return (
    <section aria-labelledby="formative-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="formative-title" className="font-display text-2xl font-normal text-ink">
          Check your understanding
        </h2>
        <p className="text-sm text-muted-foreground">
          {correct} of {questions.length} answered correctly
        </p>
      </div>
      {questions.map((question, index) => (
        <FormativeQuestion
          key={question.id}
          question={question}
          index={index}
          programme={programme}
        />
      ))}
    </section>
  )
}

function FormativeQuestion({
  question,
  index,
  programme,
}: {
  question: Question
  index: number
  programme: ProgrammeCode
}) {
  const [selected, setSelected] = useState<string | null>(question.answered?.option ?? null)
  const mutation = useFormativeAnswer()
  const result = mutation.data
    ? { correct: mutation.data.correct, feedback: mutation.data.feedback }
    : question.answered
  const solved = Boolean(question.answered?.correct || mutation.data?.correct)
  const name = `formative-${question.id}`

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border bg-white p-5">
      <legend className="sr-only">Question {index + 1}</legend>
      <p className="font-medium text-ink">
        <span className="me-2 font-display text-lg text-teal">{index + 1}</span>
        {question.prompt}
      </p>
      <div className="flex flex-col gap-2">
        {question.options.map((option) => (
          <label
            key={option.key}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors duration-200 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring',
              selected === option.key ? 'border-teal bg-teal-mist/60' : 'hover:bg-sand',
              solved && 'cursor-default',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.key}
              checked={selected === option.key}
              disabled={solved}
              onChange={() => setSelected(option.key)}
              className="mt-0.5 accent-[var(--qt-teal)]"
            />
            {option.text}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {solved ? null : (
          <Button
            size="sm"
            disabled={!selected || mutation.isPending}
            onClick={() =>
              selected &&
              mutation.mutate({
                programme,
                questionId: question.id,
                option: selected as 'A' | 'B' | 'C',
              })
            }
          >
            {result && !result.correct ? 'Try again' : 'Check answer'}
          </Button>
        )}
        <p aria-live="polite" className="flex items-start gap-2 text-sm">
          {result ? (
            <>
              {result.correct ? (
                <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
              ) : (
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-maroon" />
              )}
              <span className="text-ink">
                <span className="font-medium">{result.correct ? 'Correct. ' : 'Not quite. '}</span>
                {result.feedback}
              </span>
            </>
          ) : null}
        </p>
      </div>
    </fieldset>
  )
}
