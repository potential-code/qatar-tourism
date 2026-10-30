import { useTranslation } from 'react-i18next'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { HistoryEvidence, HistoryRow } from '@/services/credentials/history'
import { useRecordFormat } from '../utils/format'
import { useResultText } from './HistoryTable'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {children}
    </section>
  )
}

/** Stored attempts, trainer feedback and completion evidence for one history record. */
export function HistoryDetailSheet({
  row,
  onClose,
}: {
  row: HistoryRow | null
  onClose: () => void
}) {
  const { t } = useTranslation('record')
  const format = useRecordFormat()
  const resultText = useResultText()

  const evidenceValue = (item: HistoryEvidence): string => {
    switch (item.key) {
      case 'completionStatus':
        return t(`history.status.${item.value as 'completed' | 'in_progress'}`)
      case 'attendance':
        return t(`history.attendance.${item.value as 'attended'}`)
      case 'completedOn':
        return format.dateTime(String(item.value))
      case 'minutesSpent':
        return t('history.detail.minutes', { value: item.value })
      case 'score':
      case 'sessionScore':
        return t('history.result.score', { value: item.value })
      default:
        return String(item.value)
    }
  }

  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {row ? (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl font-normal">{row.title}</SheetTitle>
              <SheetDescription>
                {t('common.programme', { code: row.programmeCode })} ·{' '}
                {t(`history.mode.${row.mode}`)} · {resultText(row.result)}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-6 px-4 pb-6">
              <Section title={t('history.detail.attempts')}>
                {row.detail.attempts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('history.detail.noAttempts')}</p>
                ) : (
                  <ul className="grid gap-2">
                    {row.detail.attempts.map((attempt) => (
                      <li
                        key={attempt.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
                      >
                        <span className="font-medium">
                          {attempt.title}{' '}
                          <span className="font-normal text-muted-foreground">
                            ({t(`history.kind.${attempt.kind as 'pre' | 'post' | 'formative'}`)},{' '}
                            {t('history.detail.attemptNo', { n: attempt.attemptNo })})
                          </span>
                        </span>
                        <span className="tabular-nums">
                          {attempt.score === null
                            ? '—'
                            : t('history.result.score', { value: attempt.score })}
                          {' · '}
                          {format.date(attempt.submittedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title={t('history.detail.feedback')}>
                {row.detail.feedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('history.detail.noFeedback')}</p>
                ) : (
                  row.detail.feedback.map((item) => (
                    <blockquote
                      key={`${item.from}-${item.at}`}
                      className="rounded-lg border-s-4 border-teal bg-teal-mist px-3 py-2 text-sm"
                    >
                      <p>{item.text}</p>
                      <footer className="mt-1 text-xs text-muted-foreground">
                        {item.from} · {format.date(item.at)}
                      </footer>
                    </blockquote>
                  ))
                )}
              </Section>
              <Section title={t('history.detail.evidence')}>
                {row.detail.evidence.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('history.detail.noEvidence')}</p>
                ) : (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                    {row.detail.evidence.map((item) => (
                      <div key={item.key} className="contents">
                        <dt className="text-muted-foreground">
                          {t(`history.evidence.${item.key}`)}
                        </dt>
                        <dd className="font-medium">{evidenceValue(item)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </Section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
