import type { Competency, ProgrammeCode } from '@shared/constants'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { easeOut } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ApiError } from '@/lib/api-error'
import {
  type AssessmentKind,
  useSaveAnswer,
  useSubmitAssessment,
} from '../queries/assessments.queries'
import type { AssessmentResult, OpenAttempt } from '../types'
import { QuestionStep } from './QuestionStep'

/** Five questions, one at a time, saved as you go so you can leave and resume (brief §5). */
export function AssessmentRunner({
  attempt,
  programme,
  kind,
  title,
  onSubmitted,
}: {
  attempt: OpenAttempt
  programme: ProgrammeCode
  kind: AssessmentKind
  title: string
  onSubmitted: (result: AssessmentResult) => void
}) {
  const reduce = useReducedMotion()
  const queryClient = useQueryClient()
  const [answers, setAnswers] = useState<Record<string, string>>(
    attempt.answers as Record<string, string>,
  )
  const firstOpen = attempt.questions.findIndex((q) => !attempt.answers[q.competency as Competency])
  const [index, setIndex] = useState(firstOpen === -1 ? attempt.questions.length - 1 : firstOpen)
  const save = useSaveAnswer()
  const submit = useSubmitAssessment()
  const total = attempt.questions.length
  const answered = Object.keys(answers).length
  const question = attempt.questions[index]

  const [resumed] = useState(Object.keys(attempt.answers).length > 0)

  const select = (competency: Competency, option: 'A' | 'B' | 'C') => {
    setAnswers((prev) => ({ ...prev, [competency]: option }))
    save.mutate(
      { attemptId: attempt.id, competency, option },
      {
        onError: () =>
          toast.error('Your answer was not saved. Check your connection and choose again.'),
      },
    )
  }

  const finish = () =>
    submit.mutate(attempt.id, {
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: ['assessments', programme, kind] })
        onSubmitted(result)
      },
      onError: (e) =>
        toast.error(
          e instanceof ApiError ? e.message : 'Could not submit. Your answers are saved.',
        ),
    })

  if (!question) return null
  const last = index === total - 1

  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-white p-5 shadow-sm md:p-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ink">{title}</span>
          <span className="text-muted-foreground tabular-nums">
            {answered} of {total} answered
          </span>
        </div>
        <Progress value={(answered / total) * 100} aria-label="Questions answered" />
        {resumed ? (
          <p className="text-xs text-teal" role="status">
            Resumed where you left off. Your saved answers are kept.
          </p>
        ) : null}
        <ol className="mt-1 flex gap-2" aria-label="Questions">
          {attempt.questions.map((q, i) => (
            <li key={q.competency}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? 'step' : undefined}
                aria-label={`Question ${i + 1}${answers[q.competency] ? ', answered' : ''}`}
                className={
                  i === index
                    ? 'grid size-8 place-items-center rounded-full bg-teal text-sm font-medium text-white'
                    : answers[q.competency]
                      ? 'grid size-8 place-items-center rounded-full bg-teal-mist text-sm text-teal-deep'
                      : 'grid size-8 place-items-center rounded-full border text-sm text-muted-foreground'
                }
              >
                {answers[q.competency] && i !== index ? (
                  <Check aria-hidden className="size-3.5" />
                ) : (
                  i + 1
                )}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.competency}
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.3, ease: easeOut }}
        >
          <QuestionStep
            question={question}
            index={index}
            total={total}
            selected={answers[question.competency]}
            onSelect={select}
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <div className="flex gap-2">
          <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <ArrowLeft aria-hidden className="rtl:-scale-x-100" /> Previous
          </Button>
          <Button asChild variant="ghost">
            <Link to="/learner/assessments" search={{ programme }}>
              <Save aria-hidden /> Save and exit
            </Link>
          </Button>
        </div>
        {last ? (
          <Button
            size="lg"
            // Wait for the last answer to save, or the submit would find it missing.
            disabled={answered < total || save.isPending || submit.isPending}
            onClick={finish}
          >
            {submit.isPending ? 'Submitting' : 'Submit answers'}
          </Button>
        ) : (
          <Button disabled={!answers[question.competency]} onClick={() => setIndex((i) => i + 1)}>
            Next <ArrowRight aria-hidden className="rtl:-scale-x-100" />
          </Button>
        )}
      </div>
    </div>
  )
}
