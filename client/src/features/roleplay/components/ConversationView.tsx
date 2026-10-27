import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, Keyboard, Mic, RotateCcw, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useConversation } from '../hooks/useConversation'
import { useSpeak } from '../hooks/useSpeak'
import { useSubmitAttempt } from '../queries/roleplay.queries'
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
  const navigate = useNavigate()
  const chat = useConversation(scenario.key, scenario.visitorOpening)
  const voice = useSpeak()
  const submit = useSubmitAttempt()
  const [typed, setTyped] = useState(mode === 'text')
  const [demo, setDemo] = useState(false)
  const [usedDemo, setUsedDemo] = useState(false)
  const spoken = useRef(0)

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
          Your goal
          <span className="text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
        </summary>
        <p className="mt-2 text-sm text-ink">{scenario.learnerObjective}</p>
        <Button variant="ghost" size="sm" className="mt-2 -ms-2" onClick={restart}>
          <RotateCcw aria-hidden /> Start over
        </Button>
      </details>
      <div className="flex min-w-0 flex-col gap-4 self-start">
        <section
          aria-label={`${scenario.title} conversation`}
          className="rounded-[1.25rem] bg-white/60 p-1.5 shadow-sm ring-1 ring-ink/5"
        >
          <div className="flex h-[78dvh] min-h-[520px] flex-col overflow-hidden rounded-[calc(1.25rem-0.375rem)] border border-border/60 bg-sand lg:h-[min(780px,calc(100dvh-190px))]">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-white/80 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-maroon-mist font-display text-lg text-maroon-deep">
                  V
                </span>
                <div className="grid">
                  <p className="font-medium text-ink">{scenario.title}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    {typed ? (
                      <Keyboard aria-hidden className="size-3" />
                    ) : (
                      <Mic aria-hidden className="size-3" />
                    )}
                    {typed ? 'Text practice' : 'Voice practice'}
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
                  <AlertTitle>Your reply was not sent</AlertTitle>
                  <AlertDescription>
                    The connection dropped. Your words are back in the box: send them again.
                  </AlertDescription>
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
                      <p className="font-medium text-teal-deep">Conversation complete</p>
                      <p className="text-sm text-muted-foreground">
                        Get your score on five criteria, with evidence from what you said.
                      </p>
                    </div>
                    <Button onClick={getFeedback} disabled={submit.isPending} size="lg">
                      <Sparkles aria-hidden />
                      {submit.isPending ? 'Scoring your conversation' : 'Get feedback'}
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
                        Typed fallback for voice practice.
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
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {submit.isError ? (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle aria-hidden />
                  <AlertTitle>Feedback could not be saved</AlertTitle>
                  <AlertDescription>
                    Your conversation is still here. Try again in a moment.
                  </AlertDescription>
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
