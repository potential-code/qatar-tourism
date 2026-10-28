import { useRef } from 'react'

type AutoFocusHandler = (event: Event) => void

/**
 * Returns focus to whatever opened an overlay (dialog, alert dialog, sheet) when it closes.
 * Radix only restores focus to a `*Trigger`; most dialogs here open from a plain button through
 * state, so without this focus fell back to <body> on close (keyboard users lost their place).
 *
 * Spread the result onto the Radix content: the opener is read in `onOpenAutoFocus` (before
 * Radix moves focus inside) and focused again in `onCloseAutoFocus`. Callers' own handlers run
 * first and can still prevent the default.
 */
export function useReturnFocus(handlers: {
  onOpenAutoFocus?: AutoFocusHandler
  onCloseAutoFocus?: AutoFocusHandler
}) {
  const opener = useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus: (event: Event) => {
      const active = document.activeElement
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null
      handlers.onOpenAutoFocus?.(event)
    },
    onCloseAutoFocus: (event: Event) => {
      handlers.onCloseAutoFocus?.(event)
      if (event.defaultPrevented) return
      const target = opener.current
      opener.current = null
      if (target?.isConnected) {
        event.preventDefault()
        target.focus()
      }
    },
  }
}
