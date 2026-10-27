import { useMotionValue } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

export type MicPermission = 'unknown' | 'granted' | 'denied' | 'unsupported'

/**
 * Microphone access and a live input level for the recording meter. The level is a motion
 * value updated outside React's render cycle, so the meter animates without re-rendering.
 * Nothing is captured until `startMeter` is called from a user action, and the stream is
 * released as soon as recording stops.
 */
export function useMicrophone() {
  const supported =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  const [permission, setPermission] = useState<MicPermission>(supported ? 'unknown' : 'unsupported')
  const level = useMotionValue(0)
  const stream = useRef<MediaStream | null>(null)
  const context = useRef<AudioContext | null>(null)
  const frame = useRef<number | null>(null)

  const release = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    for (const track of stream.current?.getTracks() ?? []) track.stop()
    stream.current = null
    void context.current?.close().catch(() => undefined)
    context.current = null
    level.set(0)
  }, [level])

  /** Shows the browser's permission prompt. Resolves to the outcome. */
  const request = useCallback(async (): Promise<MicPermission> => {
    if (!supported) return 'unsupported'
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true })
      for (const track of media.getTracks()) track.stop()
      setPermission('granted')
      return 'granted'
    } catch {
      setPermission('denied')
      return 'denied'
    }
  }, [supported])

  const startMeter = useCallback(async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = media
      const audio = new AudioContext()
      context.current = audio
      const analyser = audio.createAnalyser()
      analyser.fftSize = 512
      audio.createMediaStreamSource(media).connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (const v of data) sum += ((v - 128) / 128) ** 2
        level.set(Math.min(1, Math.sqrt(sum / data.length) * 4))
        frame.current = requestAnimationFrame(tick)
      }
      tick()
      return true
    } catch {
      setPermission('denied')
      return false
    }
  }, [level])

  useEffect(() => release, [release])

  return { supported, permission, level, request, startMeter, stopMeter: release }
}
