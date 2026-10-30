import { Languages } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-error'
import { Panel } from '../../hub/components/Panel'
import { StatusPill } from '../../hub/components/StatusPill'
import { previewRule, type RuleConfig } from '../queries/assessments.queries'
import { COMPETENCY_LABELS, DIFFICULTY_LABELS, LANGUAGE_LABELS, TYPE_LABELS } from '../utils/labels'

type Preview = Awaited<ReturnType<typeof previewRule>>

/** Preview: a trial draw with the rule as configured, and the rule explained in words. Nothing is saved. */
export function RulePreview({ config }: { config: RuleConfig }) {
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  const [result, setResult] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const run = async (lang: 'en' | 'ar') => {
    setPending(true)
    setError(null)
    setLanguage(lang)
    try {
      setResult(await previewRule(config, lang))
    } catch (e) {
      setResult(null)
      setError(e instanceof ApiError ? e.message : 'The preview could not be built')
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      title="Preview"
      description="Draws a sample set with the rule as configured above, without saving anything. Preview again for a different random draw."
      action={
        <div className="flex gap-2">
          <Button onClick={() => run(language)} disabled={pending}>
            {result ? 'Draw again' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            onClick={() => run(language === 'en' ? 'ar' : 'en')}
            disabled={pending}
          >
            <Languages /> Preview in {language === 'en' ? 'Arabic' : 'English'}
          </Button>
        </div>
      }
    >
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!result && !error ? (
        <p className="text-sm text-muted-foreground">
          Choose Preview to see the questions this rule would select and how it behaves.
        </p>
      ) : null}
      {result ? (
        <div className="grid gap-5" aria-live="polite">
          <div>
            <h3 className="mb-2 text-sm font-medium text-ink">Rule used</h3>
            <ul className="grid list-disc gap-1 ps-5 text-sm text-ink/80">
              {result.explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          {result.shortfalls.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              The bank cannot satisfy every draw:{' '}
              {result.shortfalls
                .map(
                  (s) =>
                    `${COMPETENCY_LABELS[s.competency]} (${s.difficulty === 'any' ? 'any difficulty' : s.difficulty}) needs ${s.requested}, has ${s.available}`,
                )
                .join('; ')}
              . Publishing is blocked until the bank has enough published questions.
            </div>
          ) : null}
          <div>
            <h3 className="mb-2 text-sm font-medium text-ink">
              Selected questions ({result.selected.length}, {result.totalPoints} points in total)
            </h3>
            <ol className="grid gap-2">
              {result.selected.map((q) => (
                <li key={q.questionId} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink tabular-nums">{q.position}.</span>
                    <span className="text-xs text-muted-foreground">{q.questionId}</span>
                    <StatusPill tone="info">{COMPETENCY_LABELS[q.competency]}</StatusPill>
                    <StatusPill tone="neutral">{DIFFICULTY_LABELS[q.difficulty]}</StatusPill>
                    <span className="text-xs text-muted-foreground">
                      {TYPE_LABELS[q.type]} · {q.points} {q.points === 1 ? 'point' : 'points'} ·{' '}
                      {LANGUAGE_LABELS[q.language]}
                    </span>
                  </div>
                  <p lang={q.language} dir={q.language === 'ar' ? 'rtl' : 'ltr'} className="mt-1.5">
                    {q.prompt}
                  </p>
                  <ol
                    lang={q.language}
                    dir={q.language === 'ar' ? 'rtl' : 'ltr'}
                    className="mt-1 grid list-[upper-alpha] gap-0.5 ps-5 pe-5 text-muted-foreground"
                  >
                    {q.options.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </Panel>
  )
}
