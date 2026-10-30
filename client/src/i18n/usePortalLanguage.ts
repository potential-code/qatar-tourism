import type { Role } from '@shared/roles'
import { useEffect } from 'react'
import { enterForcedLanguage, type Language, leaveForcedLanguage } from './index'

/**
 * Language a portal pins, or null when the portal follows the visitor's choice. Arabic and RTL
 * cover the public site, auth and the learner portal only; trainer and admin stay English, LTR.
 */
export function portalLanguage(portal: Role): Language | null {
  return portal === 'learner' ? null : 'en'
}

/** Pins English/LTR while a trainer or admin portal is mounted; restores the saved choice after. */
export function usePortalLanguage(portal: Role): void {
  useEffect(() => {
    const pinned = portalLanguage(portal)
    if (pinned === null) return
    void enterForcedLanguage(pinned)
    return () => {
      void leaveForcedLanguage()
    }
  }, [portal])
}
