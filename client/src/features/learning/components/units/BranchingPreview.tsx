import type { ProgrammeCode } from '@shared/constants'
import { CheckCircle2, CircleAlert, MessageCircle, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { easeOut } from '@/components/motion/variants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBranchingResult } from '../../queries/learning.queries'
import type { UnitContent } from '../../types'

type Content = Extract<UnitContent, { kind: 'branching' }>
type Phase = 'decide' | 'option' | 'confirm' | 'done'

/**
 * C02 branching scenario, labelled Preview (brief §8: a branching HTML preview is not verified
 * SCORM). The brief's exact scenario, three choices, feedback and retry; then choosing an
 * option and confirming the next step. Records the choices and the final score.
 */
export function BranchingPreview({
  content,
  programme,
}: {
  content: Content
  programme: ProgrammeCode
}) {
  const reduce = useReducedMotion()
  const preview = content.preview
  const [phase, setPhase] = useState<Phase>('decide')
  const [choices, setChoices] = useState<('A' | 'B' | 'C')[]>([])
  const [option, setOption] = useState<'museum' | 'dhow' | null>(null)
  const [confirmFeedback, setConfirmFeedback] = useState<string | null>(null)
  const result = useBranchingResult()

  const last = choices.at(-1)
  const lastChoice = preview.choices.find((c) => c.key === last)

  const choose = (key: 'A' | 'B' | 'C') => setChoices((prev) => [...prev, key])
  const restart = () => {
    setPhase('decide')
    setChoices([])
    setOption(null)
    setConfirmFeedback(null)
    result.reset()
  }
  const confirm = (key: 'confirm' | 'leave') => {
    const pick = preview.confirm.find((c) => c.key === key)
    setConfirmFeedback(pick?.feedback ?? null)
    if (key === 'confirm' && option) {
      result.mutate(
        { programme, choices, optionChosen: option, confirmChoice: 'confirm' },
        { onSuccess: () => setPhase('done') },
      )
    }
  }

  const motionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.35, ease: easeOut },
      }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-maroon text-white">{preview.label}</Badge>
        <p className="text-xs text-muted-foreground">{preview.formatNote}</p>
      </div>
      <div className="rounded-xl border bg-white p-5 shadow-sm md:p-7">
        <AnimatePresence mode="wait">
          {phase === 'decide' ? (
            <motion.div key="decide" {...motionProps} className="flex flex-col gap-5">
              <p className="text-sm text-muted-foreground">{preview.family}</p>
              <figure className="flex gap-3 rounded-xl bg-sand p-4">
                <MessageCircle aria-hidden className="mt-1 size-5 shrink-0 text-maroon" />
                <blockquote className="font-display text-xl leading-snug text-ink md:text-2xl">
                  “{preview.visitorLine}”
                </blockquote>
              </figure>
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 text-sm font-medium text-ink">What do you do?</legend>
                {preview.choices.map((choice) => {
                  const tried = choices.includes(choice.key as 'A' | 'B' | 'C')
                  const isLast = last === choice.key
                  const solved = last === 'B'
                  return (
                    <button
                      key={choice.key}
                      type="button"
                      disabled={solved || (tried && !choice.correct)}
                      onClick={() => choose(choice.key as 'A' | 'B' | 'C')}
                      aria-pressed={isLast}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-4 text-start transition-all duration-200 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none enabled:hover:border-teal enabled:hover:bg-teal-mist/50 disabled:cursor-not-allowed',
                        isLast && choice.correct && 'border-teal bg-teal-mist',
                        isLast && !choice.correct && 'border-maroon/40 bg-maroon-mist',
                        tried && !isLast && 'opacity-60',
                      )}
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full border bg-white text-sm font-semibold text-teal-deep">
                        {choice.key}
                      </span>
                      <span className="pt-0.5 text-ink">{choice.text}</span>
                    </button>
                  )
                })}
              </fieldset>
              <div aria-live="polite">
                {lastChoice ? (
                  <div
                    className={cn(
                      'flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between',
                      lastChoice.correct ? 'bg-teal-mist' : 'bg-maroon-mist',
                    )}
                  >
                    <p className="flex items-start gap-2 text-sm text-ink">
                      {lastChoice.correct ? (
                        <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
                      ) : (
                        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-maroon" />
                      )}
                      <span>
                        <span className="font-medium">
                          {lastChoice.correct ? 'Correct. ' : 'Not quite. '}
                        </span>
                        {lastChoice.feedback}
                      </span>
                    </p>
                    {lastChoice.correct ? (
                      <Button onClick={() => setPhase('option')}>Continue</Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}

          {phase === 'option' ? (
            <motion.div key="option" {...motionProps} className="flex flex-col gap-5">
              <p className="font-display text-xl text-ink">{preview.next}</p>
              <p className="text-sm text-muted-foreground">
                The family is interested in culture and needs step-free access. Both options are
                verified.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {preview.options.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={option === o.key}
                    onClick={() => setOption(o.key)}
                    className={cn(
                      'flex flex-col gap-2 rounded-xl border p-4 text-start transition-all duration-200 hover:border-teal focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
                      option === o.key && 'border-teal bg-teal-mist',
                    )}
                  >
                    <span className="font-medium text-ink">{o.title}</span>
                    <span className="text-sm text-muted-foreground">{o.detail}</span>
                  </button>
                ))}
              </div>
              <Button className="self-start" disabled={!option} onClick={() => setPhase('confirm')}>
                Offer this option
              </Button>
            </motion.div>
          ) : null}

          {phase === 'confirm' ? (
            <motion.div key="confirm" {...motionProps} className="flex flex-col gap-5">
              <p className="font-display text-xl text-ink">
                The family chooses it. How do you close the conversation?
              </p>
              <div className="flex flex-col gap-3">
                {preview.confirm.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    disabled={result.isPending}
                    onClick={() => confirm(c.key)}
                    className="rounded-xl border p-4 text-start text-ink transition-all duration-200 hover:border-teal hover:bg-teal-mist/50 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {c.text}
                  </button>
                ))}
              </div>
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {confirmFeedback}
              </p>
              {result.error ? (
                <p role="alert" className="text-sm text-destructive">
                  The result could not be saved. Try again.
                </p>
              ) : null}
            </motion.div>
          ) : null}

          {phase === 'done' && result.data ? (
            <motion.div key="done" {...motionProps} className="flex flex-col items-start gap-4">
              <CheckCircle2 aria-hidden className="size-10 text-teal" />
              <h3 className="font-display text-3xl font-light text-ink">Preview complete</h3>
              <p className="text-muted-foreground">
                Score {result.data.score} out of 100
                {choices.length > 1
                  ? `, after ${choices.length - 1} ${choices.length === 2 ? 'retry' : 'retries'}`
                  : ', right first time'}
                . Your best score is {result.data.bestScore}. Choices recorded: {choices.join(', ')}
                , then {preview.options.find((o) => o.key === option)?.title.toLowerCase()} and a
                confirmed next step.
              </p>
              <Button variant="outline" onClick={restart}>
                <RotateCcw aria-hidden /> Retry the scenario
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {content.bestScore !== null && phase === 'decide' && choices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Completed before with a best score of {content.bestScore}. You can retry at any time.
        </p>
      ) : null}
    </div>
  )
}
