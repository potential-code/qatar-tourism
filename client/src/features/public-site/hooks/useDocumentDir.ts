import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] })
  return () => observer.disconnect()
}

const read = (): 'ltr' | 'rtl' => (document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr')

/**
 * The direction `<html dir>` actually has right now. i18next announces a language change a
 * moment before `setAppLanguage` flips the attribute, so layout code that measures the DOM
 * (the pinned "How it works" pan) reads this instead of `i18n.dir()`.
 */
export function useDocumentDir(): 'ltr' | 'rtl' {
  return useSyncExternalStore(subscribe, read, () => 'ltr')
}
