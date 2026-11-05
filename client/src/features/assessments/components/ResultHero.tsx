import { CheckCircle2, CircleAlert, Languages, ListChecks, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { CornerPattern } from '@/components/brand/CornerPattern'
import { easeOut } from '@/components/motion/variants'
import { cn } from '@/lib/utils'
import type { AssessmentResult } from '../types'
import { formatAttemptDate } from '../utils/format'
import { ScoreRing } from './ScoreRing'

/**
 * The result headline on the night-teal ground: the score ring, the title, when it was taken, the
 * verdict as an icon plus words, a short summary of strong areas, and the notes that apply
 * (baseline is not an entry barrier, advisory score, attempts left and the counted score). Program
 * B's post has no verdict: below the review threshold the notes suggest a review (brief §5).
 */
export function ResultHero({ result, title }: { result: AssessmentResult; title: string }) {
  const { t, i18n } = useTranslation('assessments')
  const reduce = useReducedMotion()
  const strong = result.competencies.filter((c) => c.strong).length
  const facts: { icon: typeof ListChecks; text: string }[] = [
    {
      icon: Sparkles,
      text: t('result.summaryStrong', { strong, total: result.competencies.length }),
    },
    ...(result.earnedPoints !== null
      ? [
          {
            icon: ListChecks,
            text: t('result.points', {
              earned: result.earnedPoints,
              possible: result.possiblePoints,
            }),
          },
        ]
      : []),
    ...(result.possiblePoints !== null
      ? [{ icon: Languages, text: t('result.language', { lang: t(`lang.${result.language}`) }) }]
      : []),
  ]

  return (
    <motion.section
      aria-labelledby="result-title"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="qt-grain relative isolate overflow-hidden rounded-xl bg-grad-night p-6 text-white shadow-lg md:p-10"
    >
      <CornerPattern tone="dark" />
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-10">
        <ScoreRing value={result.score} label={t('result.score', { n: result.score })} />
        <div className="flex min-w-0 flex-col items-center gap-3 text-center md:items-start md:text-start">
          <p className="inline-flex items-center gap-3 text-xs font-medium tracking-[0.22em] text-teal-soft uppercase">
            <span aria-hidden className="h-px w-8 bg-teal-soft/70" />
            {t('result.eyebrow')}
          </p>
          <h1
            id="result-title"
            className="font-display text-3xl leading-tight font-light text-balance md:text-4xl"
          >
            {t('result.title', { title })}
          </h1>
          <p className="text-sm text-white/80">
            {t('result.attemptLine', {
              no: result.attemptNo,
              date: formatAttemptDate(result.submittedAt, i18n.language),
            })}
          </p>
          {result.passed !== null ? <Verdict result={result} /> : null}
          <ul className="flex flex-wrap justify-center gap-2 md:justify-start">
            {facts.map((f) => (
              <li
                key={f.text}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90"
              >
                <f.icon aria-hidden className="size-3.5 text-teal-soft" /> {f.text}
              </li>
            ))}
          </ul>
          <Notes result={result} />
        </div>
      </div>
    </motion.section>
  )
}

function Verdict({ result }: { result: AssessmentResult }) {
  const { t } = useTranslation('assessments')
  const passed = result.passed === true
  const Icon = passed ? CheckCircle2 : CircleAlert
  return (
    <p
      className={cn(
        'inline-flex max-w-full items-start gap-2 rounded-xl bg-white px-4 py-2 text-start text-sm font-medium shadow-sm',
        passed ? 'text-teal-deep' : 'text-maroon',
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      {passed
        ? t('result.passed', { mark: result.passMark })
        : t('result.failed', { mark: result.passMark })}
    </p>
  )
}

function Notes({ result }: { result: AssessmentResult }) {
  const { t } = useTranslation('assessments')
  const notes: string[] = []
  if (result.gate === 'advisory') {
    notes.push(
      result.reviewSuggested
        ? t('result.reviewSuggested', { mark: result.reviewMark })
        : t('result.advisory'),
    )
  }
  if (result.kind === 'pre') notes.push(t('result.baselineNote'))
  if (result.attemptLimit !== null && result.kind === 'post') {
    notes.push(
      `${t('result.attemptsRemaining', { left: result.attemptsRemaining ?? 0, total: result.attemptLimit })}${
        result.counted !== null
          ? ` · ${t('result.counted', { score: result.counted, policy: t(`policy.${result.scorePolicy}`) })}`
          : ''
      }`,
    )
  }
  if (notes.length === 0) return null
  return (
    <div className="flex max-w-[62ch] flex-col gap-1.5 border-white/20 border-t pt-3 text-sm text-white/80">
      {notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
    </div>
  )
}
