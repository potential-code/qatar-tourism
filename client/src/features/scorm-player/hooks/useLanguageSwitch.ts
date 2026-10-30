import type { ContentLanguage, ProgrammeCode } from '@shared/constants'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import type { SwitchPromptPlan } from '../components/LanguageSwitchPrompt'
import { applySwitch, planSwitch } from '../queries/library.queries'

type Variant = { packageId: string; language: ContentLanguage }

/**
 * The mid-lesson language switch. `request` commits the running package's bookmark first
 * (`save`), then asks the service what the switch will do, and the prompt shows it. `confirm`
 * applies it (equivalent position mapped, or the other version starts at the beginning) and
 * hands the new variant back; `cancel` leaves everything as it was. Nothing is reset: the
 * enrolment, the other version's bookmark and the completion credit are untouched.
 */
export function useLanguageSwitch({
  programme,
  code,
  variants,
  positionUnit,
  save,
  onSwitched,
}: {
  programme: ProgrammeCode
  code: string
  variants: readonly Variant[]
  positionUnit: 'screen' | 'step'
  /** Commits the running package's bookmark and resolves once it is stored. */
  save: () => Promise<void>
  onSwitched: (variant: Variant) => void
}) {
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<Variant | null>(null)
  const [from, setFrom] = useState<Variant | null>(null)
  const [plan, setPlan] = useState<SwitchPromptPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  const cancel = useCallback(() => {
    setTarget(null)
    setFrom(null)
    setPlan(null)
    setSaving(false)
    setError(false)
  }, [])

  const request = useCallback(
    async (current: Variant, language: ContentLanguage) => {
      const next = variants.find((v) => v.language === language)
      if (!next || next.packageId === current.packageId) return
      setTarget(next)
      setFrom(current)
      setPlan(null)
      setError(false)
      setSaving(true)
      try {
        await save()
        const result = await planSwitch(code, {
          programme,
          from: current.packageId,
          to: next.packageId,
        })
        setPlan({
          language: next.language,
          mapped: result.mapped,
          position: result.position,
          positions: result.positions,
          unit: positionUnit,
        })
      } catch {
        setError(true)
      } finally {
        setSaving(false)
      }
    },
    [code, positionUnit, programme, save, variants],
  )

  const confirm = useCallback(async () => {
    if (!target || !from) return
    setPending(true)
    try {
      await applySwitch(code, { programme, from: from.packageId, to: target.packageId })
      await queryClient.invalidateQueries({ queryKey: ['learning'] })
      onSwitched(target)
      cancel()
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }, [target, from, code, programme, queryClient, onSwitched, cancel])

  return { open: target !== null, plan, saving, pending, error, request, confirm, cancel }
}
