import { AlertCircle, CheckCircle2, FileUp, RotateCcw, X } from 'lucide-react'
import { type DragEvent, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { UploadState } from '../hooks/useFileUpload'
import type { UploadLimits } from '../types'
import { formatBytes } from '../utils/files'

interface FileDropzoneProps {
  state: UploadState
  limits: UploadLimits
  onFile: (file: File) => void
  onRemove: () => void
}

const ACCEPT =
  '.pdf,.docx,.mp4,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4'

/** Drop or choose a PDF, DOCX or MP4, with validation and upload progress (brief §6). */
export function FileDropzone({ state, limits, onFile, onRemove }: FileDropzoneProps) {
  const input = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [over, setOver] = useState(false)

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setOver(false)
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const choose = () => input.current?.click()
  const hint = `PDF or DOCX up to ${limits.documentMb} MB, or MP4 up to ${limits.videoMb} MB`

  return (
    <div className="grid gap-2">
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-describedby={hintId}
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          event.target.value = ''
        }}
      />
      {state.status === 'idle' || state.status === 'invalid' ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: drop target only; the button inside is the keyboard route
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors',
            over ? 'border-teal bg-teal-mist/60' : 'border-border bg-white/70',
            state.status === 'invalid' && 'border-destructive/50',
          )}
        >
          <FileUp aria-hidden className="size-6 text-teal" />
          <p className="text-sm text-ink">Drag a file here, or</p>
          <Button type="button" variant="outline" size="sm" onClick={choose}>
            Choose a file
          </Button>
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        </div>
      ) : (
        <div className="grid gap-2 rounded-xl border bg-white p-4">
          <div className="flex items-center gap-3">
            {state.status === 'ready' ? (
              <CheckCircle2 aria-hidden className="size-5 shrink-0 text-success" />
            ) : state.status === 'error' ? (
              <AlertCircle aria-hidden className="size-5 shrink-0 text-destructive" />
            ) : (
              <FileUp aria-hidden className="size-5 shrink-0 text-teal" />
            )}
            <div className="grid min-w-0 flex-1">
              <span className="truncate text-sm font-medium text-ink">{state.file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(state.file.size)}
                {state.status === 'uploading'
                  ? `, uploading ${Math.round(state.progress * 100)}%`
                  : ''}
                {state.status === 'ready' ? ', uploaded and ready to submit' : ''}
              </span>
            </div>
            {state.status === 'error' ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onFile(state.file)}>
                <RotateCcw aria-hidden /> Retry
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              aria-label="Remove file"
            >
              <X aria-hidden />
            </Button>
          </div>
          {state.status === 'uploading' ? (
            <Progress value={state.progress * 100} aria-label="Upload progress" />
          ) : null}
        </div>
      )}
      {state.status === 'invalid' || state.status === 'error' ? (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      ) : null}
    </div>
  )
}
