import type { ProgrammeCode } from '@shared/constants'
import { Captions, CheckCircle2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
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
  const { watched, lastResult } = useVideoTracking(videoRef, {
    programme,
    courseCode,
    initialPercent: watchedPercent,
    initialPosition: positionSeconds,
  })

  useEffect(() => {
    if (lastResult?.completedNow) toast.success(`${title} is complete`)
  }, [lastResult?.completedNow, title])

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl bg-ink shadow-lg">
        <video
          ref={videoRef}
          controls
          preload="metadata"
          poster={media.poster}
          className="aspect-video w-full"
          aria-label={`${title}, sample video with captions`}
        >
          <source src={media.src} type="video/mp4" />
          <track
            kind="captions"
            src={media.captions}
            srcLang="en"
            label="English captions"
            default
          />
        </video>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-1.5 border-teal/30 text-teal-deep">
          <Captions aria-hidden /> Sample video (captioned)
        </Badge>
        <p className="text-xs text-muted-foreground">
          There is no voice track. The narration is shown as captions and in the transcript.
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            Watched {Math.min(100, watched)}%
            {completeAt
              ? `. Complete at ${completeAt}% watched.`
              : '. Answer the three questions below to complete the unit.'}
          </span>
          {completed ? (
            <span className="inline-flex items-center gap-1 font-medium text-teal">
              <CheckCircle2 aria-hidden className="size-4" /> Complete
            </span>
          ) : null}
        </div>
        <Progress value={Math.min(100, watched)} aria-label="Video watched" />
      </div>
    </div>
  )
}
