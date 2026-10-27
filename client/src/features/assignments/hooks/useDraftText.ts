import { useEffect, useState } from 'react'

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

/**
 * Keeps an unsent response in this browser as the learner types, so a lost connection or a
 * closed tab never discards their writing (brief §17). Cleared only after a successful submit.
 */
export function useDraftText(key: string) {
  const [text, setText] = useState(() => read(key))

  useEffect(() => {
    try {
      if (text) window.localStorage.setItem(key, text)
      else window.localStorage.removeItem(key)
    } catch {
      // Storage can be unavailable (private mode); the text still lives in the editor.
    }
  }, [key, text])

  return [text, setText] as const
}
