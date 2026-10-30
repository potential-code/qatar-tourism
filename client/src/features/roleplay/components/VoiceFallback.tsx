import { Keyboard, MicOff, PlayCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface VoiceFallbackProps {
  reason: 'denied' | 'unsupported'
  onShowDemonstration: () => void
  onTypeInstead: () => void
}

/** Actionable fallback when voice cannot run (brief §17: handle denied microphone access). */
export function VoiceFallback({ reason, onShowDemonstration, onTypeInstead }: VoiceFallbackProps) {
  const { t } = useTranslation('learner')
  const copy =
    reason === 'denied'
      ? {
          title: t('roleplay.fallback.deniedTitle'),
          body: t('roleplay.fallback.deniedBody'),
        }
      : {
          title: t('roleplay.fallback.unsupportedTitle'),
          body: t('roleplay.fallback.unsupportedBody'),
        }
  return (
    <div
      role="alert"
      className="flex flex-col gap-4 rounded-2xl border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-start"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
        <MicOff aria-hidden className="size-5" />
      </span>
      <div className="grid flex-1 gap-1">
        <p className="font-medium text-ink">{copy.title}</p>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onShowDemonstration}>
            <PlayCircle aria-hidden /> {t('roleplay.fallback.watch')}
          </Button>
          <Button size="sm" onClick={onTypeInstead}>
            <Keyboard aria-hidden /> {t('roleplay.fallback.type')}
          </Button>
        </div>
      </div>
    </div>
  )
}
