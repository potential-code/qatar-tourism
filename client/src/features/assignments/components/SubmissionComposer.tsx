import { countWords } from '@shared/schemas/assignment-marking'
import { AlertCircle, CopyPlus, Send } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DemoFillButton } from '@/components/DemoFillButton'
import { spring } from '@/components/motion/variants'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDraftText } from '../hooks/useDraftText'
import { useFileUpload } from '../hooks/useFileUpload'
import { useSubmitAssignment } from '../queries/assignments.queries'
import type { LearnerAssignment, UploadLimits } from '../types'
import { sampleSubmission } from '../utils/sample-answers'
import { FileDropzone } from './FileDropzone'
import { WordCountMeter } from './WordCountMeter'

interface SubmissionComposerProps {
  item: LearnerAssignment
  limits: UploadLimits
}

/** Write or upload a new version. The draft is kept in this browser until it is submitted. */
export function SubmissionComposer({ item, limits }: SubmissionComposerProps) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('learner')
  const { assignment, enrolment, versions } = item
  const latest = versions[0]
  const nextVersion = (latest?.version ?? 0) + 1
  const [text, setText] = useDraftText(`qt-assignment-draft:${assignment.id}:${enrolment.id}`)
  const uploader = useFileUpload(assignment.id)
  const submit = useSubmitAssignment(assignment.id)
  const editorId = useId()

  const words = countWords(text)
  const min = assignment.wordMin ?? 0
  const max = assignment.wordMax ?? 10_000
  const textOk = words >= min && words <= max
  const fileReady = uploader.state.status === 'ready'
  const uploading = uploader.state.status === 'uploading'
  const canSubmit = !uploading && !submit.isPending && (fileReady || textOk)
  const isPractical = assignment.allowsUpload

  const send = () => {
    submit.mutate(
      {
        enrolmentId: enrolment.id,
        responseText: text.trim() || undefined,
        uploadId: uploader.state.status === 'ready' ? uploader.state.uploadId : undefined,
      },
      {
        onSuccess: (result) => {
          setText('')
          uploader.reset()
          toast.success(t('assignments.composer.toastTitle', { version: result.version }), {
            description: t('assignments.composer.toastBody'),
          })
        },
      },
    )
  }

  const hint = fileReady
    ? t('assignments.composer.hintFile')
    : isPractical
      ? t('assignments.composer.hintWordsOrFile', { min, max })
      : t('assignments.composer.hintWords', { min, max })

  return (
    <section
      aria-labelledby={`${editorId}-title`}
      className="grid gap-5 rounded-xl border bg-card p-5 shadow-xs md:p-6"
    >
      <div className="grid gap-1">
        <h2 id={`${editorId}-title`} className="font-display text-2xl font-light text-ink">
          {latest
            ? t('assignments.composer.reviseTitle', { version: nextVersion })
            : t('assignments.composer.yourSubmission')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {latest
            ? t('assignments.composer.reviseBody', { version: latest.version })
            : t('assignments.composer.draftBody')}
        </p>
      </div>

      <DemoFillButton
        onFill={() => setText(sampleSubmission(assignment, i18n.language))}
        disabled={submit.isPending}
      />

      <div className="grid gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label htmlFor={editorId}>
            {isPractical
              ? t('assignments.composer.labelPlan')
              : t('assignments.composer.labelResponse')}
          </Label>
          {latest?.responseText && !text ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setText(latest.responseText ?? '')}
            >
              <CopyPlus aria-hidden />{' '}
              {t('assignments.composer.startFrom', { version: latest.version })}
            </Button>
          ) : null}
        </div>
        <Textarea
          id={editorId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={isPractical ? 14 : 7}
          maxLength={8000}
          className="min-h-40 text-[15px] leading-relaxed"
          placeholder={
            isPractical
              ? t('assignments.composer.placeholderPlan')
              : t('assignments.composer.placeholderResponse')
          }
          aria-describedby={`${editorId}-count`}
        />
        <div id={`${editorId}-count`}>
          <WordCountMeter words={words} min={min} max={max} />
        </div>
      </div>

      {isPractical ? (
        <div className="grid gap-3">
          <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t('assignments.composer.orUpload')}
            <span className="h-px flex-1 bg-border" />
          </div>
          <p className="text-sm text-muted-foreground">{t('assignments.composer.uploadBody')}</p>
          <FileDropzone
            state={uploader.state}
            limits={limits}
            onFile={uploader.upload}
            onRemove={uploader.reset}
          />
        </div>
      ) : null}

      {submit.isError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>{t('assignments.composer.errorTitle')}</AlertTitle>
          <AlertDescription>
            {t('assignments.composer.errorBody', { message: submit.error.message })}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">{hint}</p>
        <motion.div whileTap={reduce ? undefined : { scale: 0.97 }} transition={spring}>
          <Button size="lg" onClick={send} disabled={!canSubmit}>
            <Send aria-hidden className="rtl:-scale-x-100" />
            {submit.isPending
              ? t('assignments.composer.submitting')
              : t('assignments.composer.submit', { version: nextVersion })}
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
