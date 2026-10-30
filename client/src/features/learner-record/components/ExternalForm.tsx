import { COMPETENCIES, type Competency, CPD_UNITS, type CpdUnit } from '@shared/constants/enums'
import { FileCheck2, Paperclip } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OptionSelect } from '@/features/academy-mgmt/hub/components/OptionSelect'
import { ApiError } from '@/lib/api-error'
import {
  type ExternalDraft,
  type ExternalErrorCode,
  type ExternalErrors,
  type ExternalField,
  validateEvidenceFile,
  validateExternalDraft,
} from '@/services/credentials/external-validation'
import { sampleEvidenceFile } from '@/services/external-certificates.service'
import { useSubmitExternal } from '../queries/record.queries'

const EMPTY: ExternalDraft = {
  title: '',
  issuer: '',
  externalRef: '',
  issuedOn: '',
  expiresOn: '',
  claimedAmount: '',
  unit: 'hours',
  competency: '',
  verificationUrl: '',
}

function FieldBox({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Add certificate: the learner's own evidence of training done elsewhere. Submitting creates a
 * Pending review request and adds no approved CPD.
 */
export function ExternalForm({ today, onDone }: { today: string; onDone: () => void }) {
  const { t } = useTranslation('record')
  const submit = useSubmitExternal()
  const [draft, setDraft] = useState<ExternalDraft>(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  const [fileCode, setFileCode] = useState<ExternalErrorCode | null>(null)
  const [serverErrors, setServerErrors] = useState<ExternalErrors>({})
  const [attempted, setAttempted] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<ExternalField, boolean>>>({})
  const input = useRef<HTMLInputElement>(null)

  const local = validateExternalDraft(draft, today)
  const fileError = attempted || touched.file ? (fileCode ?? validateEvidenceFile(file)) : null
  const errors: ExternalErrors = { ...local, ...serverErrors }
  const show = (field: ExternalField): string | null => {
    const code = field === 'file' ? fileError : errors[field]
    return code && (attempted || touched[field] || serverErrors[field])
      ? t(`external.errors.${code}`)
      : null
  }
  const set = <K extends keyof ExternalDraft>(key: K, value: ExternalDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setServerErrors((prev) => ({ ...prev, [key]: undefined }))
  }
  const blur = (field: ExternalField) => setTouched((prev) => ({ ...prev, [field]: true }))

  const choose = (next: File | null) => {
    setFile(next)
    setFileCode(null)
    setTouched((prev) => ({ ...prev, file: true }))
  }

  const attachSample = async () => choose(await sampleEvidenceFile())

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setAttempted(true)
    if (Object.keys(local).length > 0 || validateEvidenceFile(file)) return
    try {
      await submit.mutateAsync({ ...draft, file })
      toast.success(t('external.submitted'))
      onDone()
    } catch (error) {
      const issues =
        error instanceof ApiError
          ? (error.details as { issues?: { path: string; message: string }[] } | undefined)?.issues
          : undefined
      const first = issues?.[0]
      if (first) {
        if (first.path === 'file') setFileCode(first.message as ExternalErrorCode)
        else setServerErrors({ [first.path]: first.message as ExternalErrorCode })
      } else toast.error(t('external.submitFailed'))
    }
  }

  const text = (
    field: 'title' | 'issuer' | 'externalRef' | 'verificationUrl',
    extra: { type?: string; dir?: 'ltr' } = {},
  ) => ({
    id: `ext-${field}`,
    value: draft[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(field, e.target.value),
    onBlur: () => blur(field),
    'aria-invalid': Boolean(show(field)),
    'aria-describedby': show(field) ? `ext-${field}-error` : undefined,
    ...extra,
  })

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="grid gap-4"
      aria-label={t('external.formTitle')}
    >
      <FieldBox id="ext-title" label={t('external.fields.title')} error={show('title')}>
        <Input {...text('title')} autoComplete="off" />
      </FieldBox>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldBox id="ext-issuer" label={t('external.fields.issuer')} error={show('issuer')}>
          <Input {...text('issuer')} autoComplete="off" />
        </FieldBox>
        <FieldBox
          id="ext-externalRef"
          label={t('external.fields.externalRef')}
          error={show('externalRef')}
        >
          <Input {...text('externalRef', { dir: 'ltr' })} autoComplete="off" />
        </FieldBox>
        <FieldBox id="ext-issuedOn" label={t('external.fields.issuedOn')} error={show('issuedOn')}>
          <Input
            id="ext-issuedOn"
            type="date"
            max={today}
            value={draft.issuedOn}
            onChange={(e) => set('issuedOn', e.target.value)}
            onBlur={() => blur('issuedOn')}
            aria-invalid={Boolean(show('issuedOn'))}
            aria-describedby={show('issuedOn') ? 'ext-issuedOn-error' : undefined}
          />
        </FieldBox>
        <FieldBox
          id="ext-expiresOn"
          label={t('external.fields.expiresOn')}
          hint={t('external.hints.optional')}
          error={show('expiresOn')}
        >
          <Input
            id="ext-expiresOn"
            type="date"
            min={draft.issuedOn || undefined}
            value={draft.expiresOn}
            onChange={(e) => set('expiresOn', e.target.value)}
            onBlur={() => blur('expiresOn')}
            aria-invalid={Boolean(show('expiresOn'))}
            aria-describedby={show('expiresOn') ? 'ext-expiresOn-error' : undefined}
          />
        </FieldBox>
        <FieldBox
          id="ext-claimedAmount"
          label={t('external.fields.claimedAmount')}
          error={show('claimedAmount')}
        >
          <Input
            id="ext-claimedAmount"
            type="number"
            inputMode="decimal"
            step="0.25"
            min="0"
            value={draft.claimedAmount}
            onChange={(e) => set('claimedAmount', e.target.value)}
            onBlur={() => blur('claimedAmount')}
            aria-invalid={Boolean(show('claimedAmount'))}
            aria-describedby={show('claimedAmount') ? 'ext-claimedAmount-error' : undefined}
          />
        </FieldBox>
        <FieldBox id="ext-unit" label={t('external.fields.unit')} error={show('unit')}>
          <OptionSelect
            id="ext-unit"
            value={draft.unit}
            onChange={(unit) => set('unit', (unit ?? 'hours') as CpdUnit)}
            options={CPD_UNITS.map((u) => ({ value: u, label: t(`cpd.units.${u}`) }))}
          />
        </FieldBox>
      </div>
      <FieldBox
        id="ext-competency"
        label={t('external.fields.competency')}
        hint={t('external.hints.optional')}
      >
        <OptionSelect
          id="ext-competency"
          value={draft.competency || null}
          onChange={(c) => set('competency', (c ?? '') as Competency | '')}
          allowNone
          noneLabel={t('external.noCompetency')}
          placeholder={t('external.noCompetency')}
          options={COMPETENCIES.map((c) => ({ value: c, label: t(`competency.${c}`) }))}
        />
      </FieldBox>
      <FieldBox
        id="ext-verificationUrl"
        label={t('external.fields.verificationUrl')}
        hint={t('external.hints.optional')}
        error={show('verificationUrl')}
      >
        <Input {...text('verificationUrl', { type: 'url', dir: 'ltr' })} placeholder="https://" />
      </FieldBox>

      <FieldBox
        id="ext-file"
        label={t('external.fields.evidence')}
        hint={t('external.hints.evidence')}
        error={show('file')}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            id="ext-file"
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            aria-invalid={Boolean(show('file'))}
            aria-describedby={show('file') ? 'ext-file-error' : undefined}
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="outline" onClick={() => input.current?.click()}>
            <Paperclip aria-hidden /> {t('external.chooseFile')}
          </Button>
          <Button type="button" variant="ghost" onClick={() => void attachSample()}>
            <FileCheck2 aria-hidden /> {t('external.useSample')}
          </Button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {file ? file.name : t('external.noFile')}
          </span>
        </div>
      </FieldBox>

      <p className="rounded-lg bg-muted px-3 py-2 text-sm">{t('external.pendingNote')}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={submit.isPending}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? t('common.submitting') : t('external.submit')}
        </Button>
      </div>
    </form>
  )
}
