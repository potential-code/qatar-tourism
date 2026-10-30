import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, Lock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DemoSettingsNote } from '@/components/layout/DemoSettingsNote'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { ApiError } from '@/lib/api-error'
import type { RenewalStepKey, RenewalView } from '@/services/credentials/renewal.service'
import { renewalQuery, useRenewalActions } from '../queries/record.queries'
import { useRecordFormat } from '../utils/format'
import { RenewalCheck } from './RenewalCheck'

const fail = (error: unknown, fallback: string) =>
  toast.error(error instanceof ApiError ? error.message : fallback)

/**
 * The renewal checklist (SPEC §7): short retraining path (when expired or after a failed check),
 * refresher course, renewal check and the remaining CPD. Finishing it issues a NEW credential;
 * the old one is kept as Superseded and is never extended.
 */
export function RenewalSheet({ code, onClose }: { code: string | null; onClose: () => void }) {
  const { t } = useTranslation('record')
  return (
    <Sheet open={code !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl font-normal">
            {t('renewal.title')}
          </SheetTitle>
          <SheetDescription>{t('renewal.description')}</SheetDescription>
        </SheetHeader>
        {code ? <RenewalBody key={code} code={code} onDone={onClose} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function RenewalBody({ code, onDone }: { code: string; onDone: () => void }) {
  const { t } = useTranslation('record')
  const format = useRecordFormat()
  const query = useQuery(renewalQuery(code))
  const actions = useRenewalActions(code)
  const [checking, setChecking] = useState(false)

  if (query.isPending) return <Skeleton className="m-4 h-64" aria-label={t('common.loading')} />
  if (query.isError) {
    return (
      <div className="p-4">
        <LoadError error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }
  const view = query.data

  const run = (promise: Promise<unknown>, success?: string) =>
    promise.then(
      () => success && toast.success(success),
      (error) => fail(error, t('renewal.failed')),
    )

  if (view.completed) {
    return (
      <div className="grid gap-3 p-4" role="status">
        <p className="font-medium text-ink">
          {t('renewal.completedTitle', { code: view.newCredentialCode ?? '—' })}
        </p>
        <p className="text-sm text-muted-foreground">{t('renewal.completedBody')}</p>
        <Button onClick={onDone} className="w-fit">
          {t('common.close')}
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-5 px-4 pb-6">
      <dl className="grid gap-2 rounded-xl border bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">{t('credentials.fields.credentialId')}</dt>
          <dd className="font-medium">{view.credentialCode}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('credentials.fields.expires')}</dt>
          <dd className="font-medium">
            {format.date(view.expiresAt)} · {t(`credentials.lifecycle.${view.lifecycle}`)}
          </dd>
        </div>
      </dl>
      <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm">{t('renewal.neverExtended')}</p>
      <DemoSettingsNote className="w-fit" />

      {!view.eligible ? (
        <p role="alert" className="text-sm text-destructive">
          {t('renewal.notEligible')}
        </p>
      ) : !view.started ? (
        <div className="grid gap-3">
          <p className="text-sm">
            {view.lifecycle === 'expired' ? t('renewal.startExpired') : t('renewal.startExpiring')}
          </p>
          <Button
            className="w-fit"
            disabled={actions.start.isPending}
            onClick={() => void run(actions.start.mutateAsync())}
          >
            {t('credentials.actions.startRenewal')}
          </Button>
        </div>
      ) : (
        <>
          {view.retrainingReason ? (
            <p role="status" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm">
              {view.retrainingReason === 'expired'
                ? t('renewal.retrainingExpired')
                : t('renewal.retrainingFailed')}
            </p>
          ) : null}
          <ol className="grid gap-3">
            {view.steps.map((step, index) => (
              <StepRow
                key={step.key}
                index={index + 1}
                view={view}
                stepKey={step.key}
                done={step.done}
                available={step.available}
                busy={
                  actions.retraining.isPending ||
                  actions.refresher.isPending ||
                  actions.check.isPending
                }
                onAction={() => {
                  if (step.key === 'retraining') {
                    void run(actions.retraining.mutateAsync(), t('renewal.retrainingDone'))
                  } else if (step.key === 'refresher') {
                    void run(actions.refresher.mutateAsync(), t('renewal.refresherDone'))
                  } else if (step.key === 'assessment') setChecking(true)
                }}
              />
            ))}
          </ol>
          {checking && !view.steps.find((s) => s.key === 'assessment')?.done ? (
            <RenewalCheck
              view={view}
              pending={actions.check.isPending}
              onSubmit={async (answers) => {
                try {
                  const result = await actions.check.mutateAsync(answers)
                  setChecking(false)
                  if (result.attempt.passed) toast.success(t('renewal.checkPassed'))
                  else toast.error(t('renewal.checkFailed', { percent: result.attempt.percent }))
                } catch (error) {
                  fail(error, t('renewal.failed'))
                }
              }}
              onCancel={() => setChecking(false)}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button
              disabled={!view.canComplete || actions.complete.isPending}
              onClick={() => void run(actions.complete.mutateAsync(), t('renewal.issued'))}
            >
              {t('renewal.complete')}
            </Button>
            {!view.canComplete ? (
              <p className="text-sm text-muted-foreground">{t('renewal.completeHint')}</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

function StepRow({
  index,
  view,
  stepKey,
  done,
  available,
  busy,
  onAction,
}: {
  index: number
  view: RenewalView
  stepKey: RenewalStepKey
  done: boolean
  available: boolean
  busy: boolean
  onAction: () => void
}) {
  const { t } = useTranslation('record')
  const format = useRecordFormat()
  const Icon = done ? CheckCircle2 : available ? Circle : Lock
  const detail =
    stepKey === 'cpd'
      ? done
        ? t('renewal.steps.cpd.done')
        : t('renewal.steps.cpd.todo', {
            value: format.number(view.cpd.remaining),
            unit: t(`cpd.units.${view.cpd.unit}`),
          })
      : stepKey === 'refresher'
        ? t('renewal.steps.refresher.detail', {
            value: format.number(view.refresherCpdHours),
            unit: t('cpd.units.hours'),
          })
        : stepKey === 'assessment'
          ? t('renewal.steps.assessment.detail', { percent: view.check.passPercent })
          : t('renewal.steps.retraining.detail')
  return (
    <li className="flex items-start gap-3 rounded-xl border bg-white p-4">
      <Icon
        aria-hidden
        className={
          done
            ? 'mt-0.5 size-5 shrink-0 text-success'
            : 'mt-0.5 size-5 shrink-0 text-muted-foreground'
        }
      />
      <div className="grid flex-1 gap-1">
        <p className="font-medium">
          {index}. {t(`renewal.steps.${stepKey}.title`)}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            (
            {done
              ? t('renewal.stepDone')
              : available
                ? t('renewal.stepOpen')
                : t('renewal.stepLocked')}
            )
          </span>
        </p>
        <p className="text-sm text-muted-foreground">{detail}</p>
        {stepKey === 'cpd' && !done ? (
          <p className="text-xs text-muted-foreground">{t('renewal.steps.cpd.how')}</p>
        ) : null}
      </div>
      {stepKey !== 'cpd' && !done && available ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={onAction}>
          {t(`renewal.steps.${stepKey}.action`)}
        </Button>
      ) : null}
    </li>
  )
}
