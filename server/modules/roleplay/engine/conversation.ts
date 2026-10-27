import type { TranscriptTurn } from '@server/db/schema/roleplay'
import { ROLEPLAY_SCENARIOS, type RolePlayScenario } from '@shared/content/scenarios'
import { type BranchKey, branchLine, REACTIONS, type ReactionKey } from './script'
import { detect, type SignalKey } from './signals'

/** A conversation is 4–6 learner turns (brief §9). */
export const MAX_LEARNER_TURNS = 6
export const MIN_LEARNER_TURNS = 4

export function findScenario(key: string): RolePlayScenario | null {
  return ROLEPLAY_SCENARIOS.find((scenario) => scenario.key === key) ?? null
}

export type ConversationState = {
  transcript: TranscriptTurn[]
  /** True once the visitor has said their closing line: no more learner turns. */
  done: boolean
}

/** Scenarios whose visitor expects options to choose from by the third reply. */
const NEEDS_OPTIONS = new Set(['changed-booking', 'accessibility-preference'])

/** Which branch, if any, the visitor takes after this reply. First match wins. */
function pickBranch(
  scenarioKey: string,
  signals: Set<SignalKey>,
  turnNo: number,
  used: Set<BranchKey>,
  offeredOptions: boolean,
): BranchKey | null {
  const candidates: [BranchKey, boolean][] = [
    ['dismissive', signals.has('dismissive')],
    ['personalData', signals.has('personalData')],
    ['overpromise', signals.has('overpromise')],
    ['noEmpathyOpening', turnNo === 1 && !signals.has('acknowledge') && !signals.has('polite')],
    ['noQuestionOpening', turnNo === 1 && !signals.has('question')],
    ['noOptions', turnNo === 3 && NEEDS_OPTIONS.has(scenarioKey) && !offeredOptions],
  ]
  for (const [key, hit] of candidates) {
    if (hit && !used.has(key)) return key
  }
  return null
}

function pickReaction(signals: Set<SignalKey>, used: Set<ReactionKey>): ReactionKey | null {
  for (const key of Object.keys(REACTIONS) as ReactionKey[]) {
    if (signals.has(key) && !used.has(key)) return key
  }
  return null
}

/**
 * Replays the scripted conversation for the learner's replies. Deterministic: the same
 * replies always give the same visitor lines, so the server can rebuild (and trust) the
 * transcript it scores instead of accepting visitor lines from the browser.
 *
 * Each reply consumes either the next spine line or a branch line. Branches are allowed only
 * while the conversation can still finish within six learner turns.
 */
export function replay(
  scenario: RolePlayScenario,
  learnerTurns: readonly string[],
): ConversationState {
  const spine = scenario.visitorFollowUps
  const transcript: TranscriptTurn[] = [{ speaker: 'visitor', text: scenario.visitorOpening }]
  const usedBranches = new Set<BranchKey>()
  const usedReactions = new Set<ReactionKey>()
  let spineIndex = 0
  let offeredOptions = false
  let done = false

  learnerTurns.forEach((text, index) => {
    if (done) return
    const turnNo = index + 1
    transcript.push({ speaker: 'learner', text })
    const signals = detect(text)
    if (signals.has('options')) offeredOptions = true

    const branchBudget = MAX_LEARNER_TURNS - spine.length - usedBranches.size
    const branch =
      branchBudget > 0
        ? pickBranch(scenario.key, signals, turnNo, usedBranches, offeredOptions)
        : null
    if (branch) {
      usedBranches.add(branch)
      transcript.push({ speaker: 'visitor', text: branchLine(scenario.key, branch) })
      return
    }

    const line = spine[spineIndex] ?? spine[spine.length - 1] ?? ''
    spineIndex += 1
    const reaction = pickReaction(signals, usedReactions)
    if (reaction) usedReactions.add(reaction)
    transcript.push({
      speaker: 'visitor',
      text: reaction ? `${REACTIONS[reaction]} ${line}` : line,
    })
    if (spineIndex >= spine.length) done = true
  })

  return { transcript, done }
}

export function learnerTurnsOf(transcript: readonly TranscriptTurn[]): string[] {
  return transcript.filter((turn) => turn.speaker === 'learner').map((turn) => turn.text)
}
