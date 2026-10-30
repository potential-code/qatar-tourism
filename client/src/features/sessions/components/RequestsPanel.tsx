import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { useSessionFormat } from '../hooks/useSessionFormat'
import {
  myRequestsQuery,
  useReplyToInfoRequest,
  useRequestEnrolment,
} from '../queries/sessions.queries'

const TONE: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  approved: 'bg-teal text-white',
  rejected: 'bg-destructive/10 text-destructive',
  info_requested: 'bg-warning/15 text-warning',
}

/**
 * The learner's approval requests (SPEC §5): Pending review, Approved or Rejected, with the
 * Academy's reason and the next step. Enrolment into Program A can also be requested here when
 * the learner is not yet enrolled; approval comes first, then the booking or waitlist.
 */
export function RequestsPanel({ canRequestA }: { canRequestA: boolean }) {
  const { t } = useTranslation('sessions')
  const format = useSessionFormat()
  const query = useQuery(myRequestsQuery())
  const request = useRequestEnrolment()
  const reply = useReplyToInfoRequest()
  const [replying, setReplying] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const items = query.data?.items ?? []
  const hasOpenA = items.some(
    (r) =>
      r.type === 'enrolment' &&
      r.programme === 'A' &&
      (r.status === 'pending' || r.status === 'info_requested'),
  )
  const showRequestA = canRequestA && !hasOpenA

  if (items.length === 0 && !showRequestA) return null

  async function sendRequest() {
    try {
      const result = await request.mutateAsync({})
      toast.success(t('requests.requestSent', { code: result.code }))
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('requests.requestFailed'))
    }
  }

  async function sendReply(code: string) {
    try {
      await reply.mutateAsync({ code, note })
      toast.success(t('requests.replySent'))
      setReplying(null)
      setNote('')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('requests.requestFailed'))
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="requests-heading">
      <div className="grid gap-1">
        <h2 id="requests-heading" className="font-display text-2xl font-light text-ink md:text-3xl">
          {t('requests.heading')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('requests.intro')}</p>
      </div>
      {showRequestA ? (
        <div>
          <Button variant="outline" onClick={sendRequest} disabled={request.isPending}>
            <ClipboardCheck aria-hidden /> {t('requests.requestA')}
          </Button>
        </div>
      ) : null}
      <ul className="flex flex-col gap-3">
        {items.map((r) => (
          <li key={r.code} className="grid gap-2 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn(TONE[r.status])}>{t(`requests.state.${r.status}`)}</Badge>
              <span className="text-xs text-muted-foreground tabular-nums">{r.code}</span>
              <span className="text-xs text-muted-foreground">
                {t('requests.submitted', { when: format.dateTime(r.submittedAt) })}
              </span>
            </div>
            <p className="font-medium text-ink">
              {r.type === 'enrolment'
                ? t('requests.enrolment', { code: r.programme ?? '' })
                : t('requests.certificate', { title: r.certificateTitle ?? '' })}
            </p>
            {r.reason ? (
              <p className="text-sm text-ink-soft">
                <span className="font-medium">{t('requests.reasonLabel')}</span> {r.reason}
              </p>
            ) : null}
            <p className="text-sm text-ink-soft">
              <span className="font-medium">{t('requests.nextLabel')}</span>{' '}
              {t(`requests.next.${r.status}`)}
            </p>
            {r.status === 'info_requested' && r.type === 'enrolment' ? (
              replying === r.code ? (
                <div className="grid gap-2">
                  <Label htmlFor={`reply-${r.code}`}>{t('requests.replyLabel')}</Label>
                  <Textarea
                    id={`reply-${r.code}`}
                    value={note}
                    maxLength={300}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => sendReply(r.code)} disabled={reply.isPending}>
                      {t('requests.replySend')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReplying(null)}>
                      {t('requests.cancelReply')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button size="sm" variant="outline" onClick={() => setReplying(r.code)}>
                    {t('requests.reply')}
                  </Button>
                </div>
              )
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
