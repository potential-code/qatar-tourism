import { Keyboard, Mic, RotateCcw, SendHorizontal, Square } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { spring } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMicrophone } from '../hooks/useMicrophone'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { LevelMeter } from './LevelMeter'
import { VoiceFallback } from './VoiceFallback'

type Stage = 'intro' | 'ready' | 'recording' | 'review'

interface VoiceComposerProps {
  onSend: (text: string) => Promise<unknown>
  disabled?: boolean
  restore?: string | null
  onShowDemonstration: () => void
  onTypeInstead: () => void
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Voice reply: explicit microphone permission, a visible recording state with a live level
 * meter and a stop control, then an editable transcript before sending (brief §9). Recording
 * never starts on its own.
 */
export function VoiceComposer({
  onSend,
  disabled,
  restore,
  onShowDemonstration,
  onTypeInstead,
}: VoiceComposerProps) {
  const reduce = useReducedMotion()
  const mic = useMicrophone()
  const speech = useSpeechRecognition()
  const [stage, setStage] = useState<Stage>(mic.permission === 'granted' ? 'ready' : 'intro')
  const [draft, setDraft] = useState('')
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (restore) {
      setDraft(restore)
      setStage('review')
    }
  }, [restore])

  useEffect(() => {
    if (stage !== 'recording') return
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [stage])

  // While recording, the editable draft follows what the browser hears.
  useEffect(() => {
    if (stage === 'recording') setDraft(speech.transcript)
  }, [speech.transcript, stage])

  const allow = async () => {
    const outcome = await mic.request()
    if (outcome === 'granted') setStage('ready')
  }

  const record = async () => {
    setSeconds(0)
    setDraft('')
    const ok = await mic.startMeter()
    if (!ok) return
    speech.start()
    setStage('recording')
  }

  const stop = () => {
    speech.stop()
    mic.stopMeter()
    setStage('review')
  }

  const send = async () => {
    const reply = draft.trim()
    if (!reply) return
    setDraft('')
    setStage('ready')
    await onSend(reply)
  }

  if (
    mic.permission === 'denied' ||
    mic.permission === 'unsupported' ||
    speech.status === 'denied'
  ) {
    return (
      <VoiceFallback
        reason={mic.permission === 'unsupported' ? 'unsupported' : 'denied'}
        onShowDemonstration={onShowDemonstration}
        onTypeInstead={onTypeInstead}
      />
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-xs">
      <AnimatePresence mode="wait" initial={false}>
        {stage === 'intro' ? (
          <motion.div
            key="intro"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-mist text-teal">
              <Mic aria-hidden className="size-5" />
            </span>
            <div className="grid flex-1 gap-1">
              <p className="font-medium text-ink">Voice practice uses your microphone</p>
              <p className="text-sm text-muted-foreground">
                Nothing is recorded until you press Record. You can check and edit the transcript
                before sending it.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={allow}>Allow microphone</Button>
              <Button variant="ghost" onClick={onTypeInstead}>
                <Keyboard aria-hidden /> Type instead
              </Button>
            </div>
          </motion.div>
        ) : stage === 'ready' ? (
          <motion.div
            key="ready"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-2 text-center"
          >
            <motion.button
              type="button"
              onClick={record}
              disabled={disabled}
              whileHover={reduce ? undefined : { scale: 1.05 }}
              whileTap={reduce ? undefined : { scale: 0.95 }}
              transition={spring}
              className="flex size-16 items-center justify-center rounded-full bg-maroon text-white shadow-md transition-colors hover:bg-maroon-deep focus-visible:ring-4 focus-visible:ring-maroon/30 focus-visible:outline-none disabled:opacity-50"
            >
              <Mic aria-hidden className="size-6" />
              <span className="sr-only">Record your reply</span>
            </motion.button>
            <p className="text-sm text-muted-foreground">
              {disabled
                ? 'Wait for the visitor to finish.'
                : 'Press Record, speak your reply, then press Stop.'}
            </p>
            {!speech.supported ? (
              <p className="text-xs text-muted-foreground">
                Speech to text is not available in this browser. After recording, type what you
                said.
              </p>
            ) : null}
          </motion.div>
        ) : stage === 'recording' ? (
          <motion.div
            key="recording"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status" className="flex items-center gap-2 font-medium text-maroon-deep">
                <motion.span
                  aria-hidden
                  className="size-2.5 rounded-full bg-maroon"
                  animate={reduce ? undefined : { opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
                />
                Recording{' '}
                <span className="tabular-nums text-muted-foreground">{clock(seconds)}</span>
              </p>
              <LevelMeter level={mic.level} />
              <Button variant="secondary" onClick={stop}>
                <Square aria-hidden className="fill-current" /> Stop
              </Button>
            </div>
            <p className="min-h-6 text-sm text-muted-foreground italic" aria-live="polite">
              {draft ||
                (speech.supported
                  ? 'Listening...'
                  : 'Recording. Type what you said after you stop.')}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="review"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid gap-3"
          >
            <Label htmlFor="voice-transcript">Your transcript (edit before sending)</Label>
            <Textarea
              id="voice-transcript"
              value={draft}
              maxLength={1000}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder={
                speech.supported
                  ? 'Nothing was heard. Record again or type your reply.'
                  : 'Type what you said to the visitor.'
              }
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={record} disabled={disabled}>
                <RotateCcw aria-hidden /> Record again
              </Button>
              <Button onClick={send} disabled={disabled || !draft.trim()}>
                Send reply <SendHorizontal aria-hidden className="rtl:-scale-x-100" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
