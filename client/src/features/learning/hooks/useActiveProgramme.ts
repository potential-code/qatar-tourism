import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect } from 'react'
import { enrolmentsQuery } from '../queries/learning.queries'

const STORAGE_KEY = 'qta.learner.programme'

function readStored(): ProgrammeCode | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'A' || value === 'B' || value === 'C' ? value : null
  } catch {
    return null
  }
}

function store(value: ProgrammeCode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Storage may be blocked; the URL still carries the choice.
  }
}

/**
 * The programme the learner is looking at. Explicit (brief §5): the `?programme=` search
 * parameter wins, then the last choice on this device, then the first enrolment.
 */
export function useActiveProgramme() {
  const search = useSearch({ strict: false }) as { programme?: ProgrammeCode }
  const navigate = useNavigate()
  const enrolments = useQuery(enrolmentsQuery())
  const items = enrolments.data?.items ?? []
  const held = new Set(items.map((e) => e.programme))

  const stored = readStored()
  const programme: ProgrammeCode | null =
    search.programme && held.has(search.programme)
      ? search.programme
      : stored && held.has(stored)
        ? stored
        : (items[0]?.programme ?? null)

  useEffect(() => {
    if (programme) store(programme)
  }, [programme])

  const setProgramme = useCallback(
    (next: ProgrammeCode) => {
      store(next)
      void navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => ({ ...prev, programme: next }),
        replace: true,
      } as never)
    },
    [navigate],
  )

  return {
    programme,
    enrolments: items,
    learner: enrolments.data?.learner ?? null,
    isLoading: enrolments.isLoading,
    error: enrolments.error,
    refetch: enrolments.refetch,
    setProgramme,
  }
}
