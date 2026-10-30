import { useCallback, useEffect, useRef, useState } from 'react'
import i18n from '@/i18n'

/** Minimal typing for the Web Speech API, which TypeScript's DOM lib does not ship. */
type RecognitionResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { resultIndex: number; results: RecognitionResultList }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type RecognitionCtor = new () => RecognitionLike

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type SpeechStatus = 'idle' | 'listening' | 'denied' | 'unavailable'

/**
 * Browser speech-to-text for voice practice. Only ever starts from an explicit user action
 * (brief §9: never record automatically). The transcript stays editable afterwards.
 */
export function useSpeechRecognition() {
  const supported = recognitionCtor() !== null
  const [status, setStatus] = useState<SpeechStatus>(supported ? 'idle' : 'unavailable')
  const [finalText, setFinalText] = useState('')
  const [interim, setInterim] = useState('')
  const recognition = useRef<RecognitionLike | null>(null)

  const stop = useCallback(() => {
    recognition.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Ctor = recognitionCtor()
    if (!Ctor) {
      setStatus('unavailable')
      return
    }
    const rec = new Ctor()
    rec.lang = i18n.language === 'ar' ? 'ar-QA' : 'en-GB'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (event) => {
      let finals = ''
      let partial = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result) continue
        if (result.isFinal) finals += `${result[0].transcript} `
        else partial += result[0].transcript
      }
      setFinalText(finals.trim())
      setInterim(partial)
    }
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatus('denied')
      } else if (event.error === 'network' || event.error === 'audio-capture') {
        setStatus('unavailable')
      }
    }
    rec.onend = () => {
      setInterim('')
      setStatus((current) => (current === 'listening' ? 'idle' : current))
    }
    setFinalText('')
    setInterim('')
    recognition.current = rec
    try {
      rec.start()
      setStatus('listening')
    } catch {
      setStatus('unavailable')
    }
  }, [])

  useEffect(() => () => recognition.current?.abort(), [])

  return {
    supported,
    status,
    transcript: [finalText, interim].filter(Boolean).join(' '),
    start,
    stop,
  }
}
