import type { ProgrammeCode } from '@shared/constants'
import { Captions, CheckCircle2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useVideoTracking } from '../../hooks/useVideoTracking'

/** Captioned sample video with watched-progress tracking (brief §7). */
export function VideoPlayer({
  programme,
  courseCode,
  media,
  title,
  watchedPercent,
  positionSeconds,
  completeAt,
  completed,
}: {
  programme: ProgrammeCode
  courseCode: 'C01' | 'C03'
  media: { src: string; captions: string; poster: string }
  title: string
  watchedPercent: number
  positionSeconds: number
  completeAt: number | null
  completed: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { t } = useTranslation('learner')
  const { watched, lastResult } = useVideoTracking(videoRef, {
    programme,
    courseCode,
    initialPercent: watchedPercent,
    initialPosition: positionSeconds,
  })

  useEffect(() => {
    if (lastResult?.completedNow) toast.success(t('learning.video.complete', { title }))
  }, [lastResult?.completedNow, title, t])

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl bg-ink shadow-lg">
        <video
          ref={videoRef}
          controls
          preload="metadata"
          poster={media.poster}
          className="aspect-video w-full"
          aria-label={t('learning.video.aria', { title })}
        >
          <source src={media.src} type="video/mp4" />
          <track
            kind="captions"
            src={media.captions}
            srcLang="en"
            label={t('learning.video.captionsLabel')}
            default
          />
        </video>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-1.5 border-teal/30 text-teal-deep">
          <Captions aria-hidden /> {t('learning.video.badge')}
        </Badge>
        <p className="text-xs text-muted-foreground">{t('learning.video.noVoice')}</p>
      </div>
      <div className="flex flex-col gap-2 rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {t('learning.video.watched', { n: Math.min(100, watched) })}
            {completeAt
              ? t('learning.video.completeAt', { n: completeAt })
              : t('learning.video.answerQuestions')}
          </span>
          {completed ? (
            <span className="inline-flex items-center gap-1 font-medium text-teal">
              <CheckCircle2 aria-hidden className="size-4" /> {t('learning.unit.complete')}
            </span>
          ) : null}
        </div>
        <Progress value={Math.min(100, watched)} aria-label={t('learning.video.progressAria')} />
      </div>
    </div>
  )
}
