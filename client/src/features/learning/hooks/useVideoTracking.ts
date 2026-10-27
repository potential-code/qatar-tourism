import type { ProgrammeCode } from '@shared/constants'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { useVideoProgress } from '../queries/learning.queries'

/**
 * Tracks the furthest point watched and reports it in 10 percent steps, on pause and at the end.
 * The server completes C01 at 90 percent (brief §7) and records the position for resume.
 */
export function useVideoTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: {
    programme: ProgrammeCode
    courseCode: 'C01' | 'C03'
    initialPercent: number
    initialPosition: number
  },
) {
  const mutation = useVideoProgress()
  const furthest = useRef(options.initialPercent)
  const reported = useRef(Math.floor(options.initialPercent / 10) * 10)
  const [watched, setWatched] = useState(options.initialPercent)
  const { mutate } = mutation

  const report = useCallback(
    (force = false) => {
      const video = videoRef.current
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
      const bucket = Math.floor(furthest.current / 10) * 10
      if (!force && bucket <= reported.current) return
      reported.current = Math.max(reported.current, bucket)
      mutate({
        programme: options.programme,
        courseCode: options.courseCode,
        watchedPercent: Math.min(100, Math.round(furthest.current)),
        positionSeconds: Math.round(video.currentTime),
      })
    },
    [mutate, options.courseCode, options.programme, videoRef],
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onMeta = () => {
      if (options.initialPosition > 0 && options.initialPosition < video.duration - 3) {
        video.currentTime = options.initialPosition
      }
    }
    const onTime = () => {
      if (!video.duration) return
      const percent = (video.currentTime / video.duration) * 100
      if (percent > furthest.current) {
        furthest.current = percent
        setWatched(Math.round(percent))
        report()
      }
    }
    const onPause = () => report(true)
    const onEnded = () => {
      furthest.current = 100
      setWatched(100)
      report(true)
    }
    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
    }
  }, [options.initialPosition, report, videoRef])

  return { watched, lastResult: mutation.data, error: mutation.error }
}
