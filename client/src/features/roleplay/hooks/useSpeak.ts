import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { tr } from '@/i18n/localised'

/** Reads the simulated visitor's line aloud with the browser's speech synthesis. */
export function useSpeak() {
  const { i18n } = useTranslation()
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)

  const cancel = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text) return
      window.speechSynthesis.cancel()
      const arabic = i18n.language === 'ar'
      const utterance = new SpeechSynthesisUtterance(tr(text, i18n.language))
      utterance.lang = arabic ? 'ar-QA' : 'en-GB'
      utterance.rate = 1
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      setSpeaking(true)
      window.speechSynthesis.speak(utterance)
    },
    [supported, i18n.language],
  )

  useEffect(() => cancel, [cancel])

  return { supported, speaking, speak, cancel }
}
