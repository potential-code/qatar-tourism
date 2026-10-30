import type { ProgrammeCode } from '@shared/constants'
import { queryOptions } from '@tanstack/react-query'
import * as library from '@/services/content-library.service'

/** The unit's language variants with the signed-in learner's bookmark on each. */
export const libraryUnitQuery = (programme: ProgrammeCode, code: string) =>
  queryOptions({
    queryKey: ['learning', 'library', programme, code],
    queryFn: () => library.getLibraryUnit(programme, code),
    staleTime: 0,
  })

export const planSwitch = library.planLanguageSwitch
export const applySwitch = library.switchLanguage
