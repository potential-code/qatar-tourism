import { Clock, Keyboard, Mic, Target } from 'lucide-react'
import { useState } from 'react'
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
import type { PracticeEnrolment, PracticeMode, ScenarioSummary } from '../types'
import { COMPETENCY_LABEL, SCENARIO_IMAGE } from '../utils/labels'
import { DifficultyPips } from './DifficultyPips'
import { ModeOption } from './ModeOption'

interface SessionSetupProps {
  scenario: ScenarioSummary
  enrolments: PracticeEnrolment[]
  onStart: (choice: { mode: PracticeMode; enrolmentId: string }) => void
}

/** Before the conversation: the goal, the visitor's opening, and Text or Voice (brief §9). */
export function SessionSetup({ scenario, enrolments, onStart }: SessionSetupProps) {
  const [mode, setMode] = useState<PracticeMode>('text')
  const [enrolmentId, setEnrolmentId] = useState(enrolments[0]?.id ?? '')

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
                {COMPETENCY_LABEL[scenario.competency]}
              </Badge>
              <span className="inline-flex items-center gap-1 text-xs text-white/85">
                <Clock aria-hidden className="size-3.5" /> About {scenario.estimatedMinutes} minutes
              </span>
            </div>
            <p className="text-xs font-medium tracking-wide text-white/75 uppercase">
              The visitor says
            </p>
            <blockquote className="font-display text-2xl leading-snug font-light md:text-3xl">
              “{scenario.visitorOpening}”
            </blockquote>
          </div>
        </PhotoPanel>
      </Reveal>

      <Reveal delay={0.08} className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-xs">
        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-teal">
            <Target aria-hidden className="size-4" />
            <h2 className="text-sm font-medium">Your goal</h2>
          </div>
          <p className="font-display text-xl leading-snug text-ink">{scenario.learnerObjective}</p>
          <DifficultyPips difficulty={scenario.difficulty} />
        </div>

        <fieldset className="grid gap-3">
          <legend className="mb-1 text-sm font-medium text-ink">
            How do you want to practise?
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeOption
              value="text"
              icon={Keyboard}
              title="Text"
              description="Type your replies in a chat."
              checked={mode === 'text'}
              onSelect={() => setMode('text')}
            />
            <ModeOption
              value="voice"
              icon={Mic}
              title="Voice"
              description="Speak your replies. You approve the microphone first."
              checked={mode === 'voice'}
              onSelect={() => setMode('voice')}
            />
          </div>
        </fieldset>

        {enrolments.length > 1 ? (
          <div className="grid gap-2">
            <Label htmlFor="practice-enrolment">Record this practice in</Label>
            <Select value={enrolmentId} onValueChange={setEnrolmentId}>
              <SelectTrigger id="practice-enrolment" className="w-full sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enrolments.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    Program {e.programmeCode}: {e.programmeTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          A conversation takes four to six replies. You are scored on what you say, never on accent,
          voice or background.
        </p>

        <div className="mt-auto flex flex-wrap gap-3">
          <Button size="lg" onClick={() => onStart({ mode, enrolmentId })} disabled={!enrolmentId}>
            Start conversation
          </Button>
        </div>
      </Reveal>
    </div>
  )
}
