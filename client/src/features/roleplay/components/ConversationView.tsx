import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, Keyboard, Mic, RotateCcw, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { tr } from '@/i18n/localised'
import { useConversation } from '../hooks/useConversation'
import { useSpeak } from '../hooks/useSpeak'
import { demonstrationQuery, useSubmitAttempt } from '../queries/roleplay.queries'
import type { PracticeMode, ScenarioSummary } from '../types'
import { ChatThread } from './ChatThread'
import { PracticeSidePanel } from './PracticeSidePanel'
import { RecordedDemonstration } from './RecordedDemonstration'
import { TextComposer } from './TextComposer'
import { TurnProgress } from './TurnProgress'
import { VoiceComposer } from './VoiceComposer'

interface ConversationViewProps {
  scenario: ScenarioSummary
  mode: PracticeMode
  enrolmentId: string
  label: string
}

/** The live, scripted conversation and its submission for feedback. */
export function ConversationView({ scenario, mode, enrolmentId, label }: ConversationViewProps) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('learner')
  const navigate = useNavigate()
  const chat = useConversation(scenario.key, scenario.visitorOpening)
  const voice = useSpeak()
  const submit = useSubmitAttempt()
  const [typed, setTyped] = useState(mode === 'text')
  const [demo, setDemo] = useState(false)
  const [usedDemo, setUsedDemo] = useState(false)
  const spoken = useRef(0)
  // Presenter aid for voice mode: the demonstration's next learner line, for rooms where the
  // browser cannot hear the microphone. It fills the editable transcript; it never sends.
  const demonstration = useQuery({ ...demonstrationQuery(scenario.key), enabled: mode === 'voice' })
  const learnerSoFar = chat.transcript.filter((line) => line.speaker === 'learner').length
  const sampleReply =
    demonstration.data?.transcript.filter((line) => line.speaker === 'learner')[learnerSoFar]
      ?.text ?? null

  // In voice mode the visitor's new line is read aloud once it arrives.
  const lines = chat.transcript.length
  useEffect(() => {
    if (mode !== 'voice' || typed || lines <= spoken.current) return
    spoken.current = lines
    const last = chat.transcript[lines - 1]
    if (last?.speaker === 'visitor') voice.speak(last.text)
  }, [lines, mode, typed, chat.transcript, voice])

  const restart = () => {
    voice.cancel()
    spoken.current = 0
    chat.reset()
    submit.reset()
  }

  const getFeedback = () => {
    const learnerTurns = chat.transcript.filter((t) => t.speaker === 'learner').map((t) => t.text)
    submit.mutate(
      {
        enrolmentId,
        scenarioKey: scenario.key,
        mode: typed ? 'text' : 'voice',
        learnerTurns,
        usedRecordedDemo: usedDemo,
      },
      {
        onSuccess: (attempt) =>
          navigate({
            to: '/learner/practice/attempts/$attemptId',
            params: { attemptId: attempt.id },
          }),
      },
    )
  }

  const showDemo = () => {
    setDemo(true)
    setUsedDemo(true)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <details className="group rounded-xl border bg-card px-4 py-3 shadow-xs lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-teal">
          {t('roleplay.conversation.goal')}
          <span className="text-xs font-normal text-muted-foreground group-open:hidden">
            {t('roleplay.conversation.show')}
          </span>
        </summary>
        <p className="mt-2 text-sm text-ink">{tr(scenario.learnerObjective, i18n.language)}</p>
        <Button variant="ghost" size="sm" className="mt-2 -ms-2" onClick={restart}>
          <RotateCcw aria-hidden /> {t('roleplay.conversation.startOver')}
        </Button>
      </details>
      <div className="flex min-w-0 flex-col gap-4 self-start">
        <section
          aria-label={t('roleplay.conversation.regionLabel', {
            title: tr(scenario.title, i18n.language),
          })}
          className="rounded-[1.25rem] bg-white/60 p-1.5 shadow-sm ring-1 ring-ink/5"
        >
          <div className="flex h-[78dvh] min-h-[520px] flex-col overflow-hidden rounded-[calc(1.25rem-0.375rem)] border border-border/60 bg-sand lg:h-[min(780px,calc(100dvh-190px))]">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-white/80 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-maroon-mist font-display text-lg text-maroon-deep">
                  V
                </span>
                <div className="grid">
                  <p className="font-medium text-ink">{tr(scenario.title, i18n.language)}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    {typed ? (
                      <Keyboard aria-hidden className="size-3" />
                    ) : (
                      <Mic aria-hidden className="size-3" />
                    )}
                    {typed
                      ? t('roleplay.conversation.textPractice')
                      : t('roleplay.conversation.voicePractice')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <TurnProgress turns={chat.turnCount} done={chat.done} />
                <SimulatedTag label={label} />
              </div>
            </header>

            <ChatThread
              transcript={chat.transcript}
              typing={chat.pending}
              onSpeak={!typed && voice.supported ? voice.speak : undefined}
            />

            <div className="border-t border-border/70 bg-white/70 p-3 sm:p-4">
              {chat.failedReply ? (
                <Alert variant="destructive" className="mb-3">
                  <AlertCircle aria-hidden />
                  <AlertTitle>{t('roleplay.conversation.failedTitle')}</AlertTitle>
                  <AlertDescription>{t('roleplay.conversation.failedBody')}</AlertDescription>
                </Alert>
              ) : null}
              <AnimatePresence mode="wait" initial={false}>
                {chat.done ? (
                  <motion.div
                    key="complete"
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-start gap-3 rounded-xl bg-teal-mist/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="grid gap-0.5">
                      <p className="font-medium text-teal-deep">
                        {t('roleplay.conversation.completeTitle')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('roleplay.conversation.completeBody')}
                      </p>
                    </div>
                    <Button onClick={getFeedback} disabled={submit.isPending} size="lg">
                      <Sparkles aria-hidden />
                      {submit.isPending
                        ? t('roleplay.conversation.scoring')
                        : t('roleplay.conversation.getFeedback')}
                    </Button>
                  </motion.div>
                ) : typed ? (
                  <motion.div
                    key="text"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <TextComposer
                      onSend={chat.send}
                      disabled={chat.pending}
                      restore={chat.failedReply}
                    />
                    {mode === 'voice' ? (
                      <p className="mt-2 px-2 text-xs text-muted-foreground">
                        {t('roleplay.conversation.typedFallback')}
                      </p>
                    ) : null}
                  </motion.div>
                ) : (
                  <motion.div
                    key="voice"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <VoiceComposer
                      onSend={chat.send}
                      disabled={chat.pending}
                      restore={chat.failedReply}
                      onShowDemonstration={showDemo}
                      onTypeInstead={() => setTyped(true)}
                      sampleReply={sampleReply}
                      onSampleUsed={() => setUsedDemo(true)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {submit.isError ? (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle aria-hidden />
                  <AlertTitle>{t('roleplay.conversation.saveFailedTitle')}</AlertTitle>
                  <AlertDescription>{t('roleplay.conversation.saveFailedBody')}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </div>
        </section>
        {demo ? (
          <RecordedDemonstration
            scenarioKey={scenario.key}
            onClose={() => {
              setDemo(false)
              setTyped(true)
            }}
          />
        ) : null}
      </div>

      <div className="hidden self-start lg:block">
        <PracticeSidePanel objective={scenario.learnerObjective} onRestart={restart} />
      </div>
    </div>
  )
}
