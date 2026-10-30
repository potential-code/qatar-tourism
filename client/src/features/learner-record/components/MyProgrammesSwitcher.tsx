import type { ProgrammeCode } from '@shared/constants'
import { Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActiveProgramme } from '@/features/learning/hooks/useActiveProgramme'

/**
 * "My programmes" (SPEC §4): switches the programme context in the learner header without
 * another sign-in. It reuses the active-programme state behind `?programme=` so every learner
 * page follows. Shown only when the learner holds more than one programme.
 */
export function MyProgrammesSwitcher() {
  const { t } = useTranslation('record')
  const { programme, enrolments, setProgramme } = useActiveProgramme()
  if (enrolments.length < 2 || !programme) return null
  return (
    <Select value={programme} onValueChange={(value) => setProgramme(value as ProgrammeCode)}>
      <SelectTrigger
        aria-label={t('switcher.label')}
        className="h-9 w-auto max-w-28 gap-2 min-[420px]:max-w-44 rounded-full bg-white sm:max-w-56 xl:max-w-80"
      >
        <Layers aria-hidden className="size-4 shrink-0 text-teal" />
        <span className="sr-only md:not-sr-only md:text-muted-foreground">
          {t('switcher.label')}:
        </span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {enrolments.map((e) => (
          <SelectItem key={e.programme} value={e.programme}>
            {t('switcher.option', { code: e.programme, title: e.programmeTitle })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
