import type { ProgrammeCode } from '@shared/constants'
import { Clock, Keyboard, Mic, Target } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { Reveal } from '@/components/motion/Reveal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { tr } from '@/i18n/localised'
import type { PracticeEnrolment, PracticeMode, ScenarioSummary } from '../types'
import { COMPETENCY_LABEL, SCENARIO_IMAGE } from '../utils/labels'
import { defaultEnrolmentId } from '../utils/programme'
import { DifficultyPips } from './DifficultyPips'
import { ModeOption } from './ModeOption'

interface SessionSetupProps {
  scenario: ScenarioSummary
  enrolments: PracticeEnrolment[]
  /** The active programme (top-bar switcher): the default for "Record this practice in". */
  programme?: ProgrammeCode | null
  onStart: (choice: { mode: PracticeMode; enrolmentId: string }) => void
}

/** Before the conversation: the goal, the visitor's opening, and Text or Voice (brief §9). */
export function SessionSetup({ scenario, enrolments, programme, onStart }: SessionSetupProps) {
  const { t, i18n } = useTranslation('learner')
  const [mode, setMode] = useState<PracticeMode>('text')
  const [enrolmentId, setEnrolmentId] = useState(() => defaultEnrolmentId(enrolments, programme))

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <Reveal>
        <PhotoPanel
          src={SCENARIO_IMAGE[scenario.key] ?? '/images/official/city-view.jpg'}
          alt=""
          fade="bottom"
          className="flex min-h-[280px] flex-col justify-end rounded-xl lg:h-full"
        >
          <div className="grid gap-3 p-6 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/15 text-white backdrop-blur">
                {tr(COMPETENCY_LABEL[scenario.competency], i18n.language)}
              </Badge>
              <span className="inline-flex items-center gap-1 text-xs text-white/85">
                <Clock aria-hidden className="size-3.5" />{' '}
                {t('roleplay.setup.about', { n: scenario.estimatedMinutes })}
              </span>
            </div>
            <p className="text-xs font-medium tracking-wide text-white/75 uppercase">
              {t('roleplay.setup.visitorSays')}
            </p>
            <blockquote className="font-display text-2xl leading-snug font-light md:text-3xl">
              “{tr(scenario.visitorOpening, i18n.language)}”
            </blockquote>
          </div>
        </PhotoPanel>
      </Reveal>

      <Reveal delay={0.08} className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-xs">
        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-teal">
            <Target aria-hidden className="size-4" />
            <h2 className="text-sm font-medium">{t('roleplay.setup.goal')}</h2>
          </div>
          <p className="font-display text-xl leading-snug text-ink">
            {tr(scenario.learnerObjective, i18n.language)}
          </p>
          <DifficultyPips difficulty={scenario.difficulty} />
        </div>

        <fieldset className="grid gap-3">
          <legend className="mb-1 text-sm font-medium text-ink">
            {t('roleplay.setup.howTitle')}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeOption
              value="text"
              icon={Keyboard}
              title={t('roleplay.setup.textTitle')}
              description={t('roleplay.setup.textDescription')}
              checked={mode === 'text'}
              onSelect={() => setMode('text')}
            />
            <ModeOption
              value="voice"
              icon={Mic}
              title={t('roleplay.setup.voiceTitle')}
              description={t('roleplay.setup.voiceDescription')}
              checked={mode === 'voice'}
              onSelect={() => setMode('voice')}
            />
          </div>
        </fieldset>

        {enrolments.length > 1 ? (
          <div className="grid gap-2">
            <Label htmlFor="practice-enrolment">{t('roleplay.setup.recordIn')}</Label>
            <Select value={enrolmentId} onValueChange={setEnrolmentId}>
              <SelectTrigger id="practice-enrolment" className="w-full sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enrolments.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {t('roleplay.setup.programmeOption', {
                      code: e.programmeCode,
                      title: tr(e.programmeTitle, i18n.language),
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">{t('roleplay.setup.note')}</p>

        <div className="mt-auto flex flex-wrap gap-3">
          <Button size="lg" onClick={() => onStart({ mode, enrolmentId })} disabled={!enrolmentId}>
            {t('roleplay.setup.start')}
          </Button>
        </div>
      </Reveal>
    </div>
  )
}
