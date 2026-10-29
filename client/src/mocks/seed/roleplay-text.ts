import { ROLEPLAY_RUBRIC } from '@shared/constants'
import { ROLEPLAY_SCENARIOS } from '@shared/content/scenarios'
import type { CriterionFeedback, TranscriptTurn } from '@shared/types/db'
import type { Rng } from './rng'

/**
 * Scripted learner replies and feedback phrases for seeded role-play attempts. Original
 * demonstration text only. Each scenario has five learner lines, in conversational order.
 */
const LEARNER_LINES: Record<string, readonly string[]> = {
  'changed-booking': [
    'I am sorry about this, I can see why that is frustrating. Let me help you find a good alternative.',
    'Could you tell me how much time you have this afternoon, and who is travelling with you?',
    'I can offer two options that I have checked: a later guided visit today, or the same experience tomorrow morning.',
    'If neither works, I will pass your request to my supervisor so you get an answer before the end of the day.',
    'To confirm: I will check availability for the later visit and message you within the hour.',
  ],
  'unclear-directions': [
    'Do not worry, we will find the meeting point together. Can you tell me what you can see around you?',
    'Walk past the coffee shop, then turn left at the second crossing. The meeting point is on your right.',
    'I will check the route on the official map so I give you the right directions.',
    'Could you repeat the steps back to me, so I know I explained them clearly?',
    'If you are still unsure, call the Academy desk and we will meet you halfway.',
  ],
  'accessibility-preference': [
    'Thank you for telling me. Could you share what kind of step-free access your group member needs?',
    'I will confirm the route and entrances with the venue before I promise anything.',
    'Having checked, the main route is step-free. The side path is uneven, so I suggest the main route.',
    'If the main route cannot be confirmed, I can offer an alternative visit with full step-free access.',
    'I will call you back by this afternoon with a verified answer.',
  ],
  'group-running-late': [
    'Thank you for letting us know. How long do you expect the rest of your group to be?',
    'The stated policy is that late arrivals may join if space remains, and I cannot promise more than that.',
    'I cannot make an exception myself, but I will ask my supervisor to review your situation now.',
    'I will message you as soon as I have a decision, and keep your place as far as the policy allows.',
    'To confirm: wait at the entrance, and I will update you within fifteen minutes.',
  ],
}

const STRENGTHS = [
  'You acknowledged the visitor’s frustration.',
  'You stayed calm and respectful throughout.',
  'You asked a useful question before offering options.',
  'You gave clear steps in plain language.',
]

const IMPROVE = [
  'Verify availability before promising an alternative.',
  'Check understanding before ending the conversation.',
  'Offer a second option earlier in the conversation.',
  'Ask one question about timing before presenting options.',
]

const SUGGESTIONS: Record<string, readonly [low: string, high: string]> = {
  empathy_professionalism: [
    'Acknowledge the visitor’s feelings first, in one short sentence.',
    'Keep this warm, steady tone through the whole conversation.',
  ],
  discovery_questions: [
    'Ask one question about timing or interests before suggesting anything.',
    'Your questions were well targeted. Keep them to one at a time.',
  ],
  clarity: [
    'Use shorter sentences and plain words, then check understanding.',
    'Clear and easy to follow. Summarise the next step once more at the end.',
  ],
  accuracy_boundaries: [
    'Verify from an authorised source before you promise anything.',
    'You kept to what you could verify. Keep naming the limits of your authority.',
  ],
  solution_followthrough: [
    'Offer two feasible options and say exactly what happens next.',
    'A practical solution with a clear follow-up. Add a time for the follow-up.',
  ],
}

export type RolePlayDraft = {
  transcript: TranscriptTurn[]
  scores: number[]
  total: number
  feedback: {
    criteria: CriterionFeedback[]
    strength: string
    improve: string
    retry: string
  }
}

/** A deterministic attempt: `quality` 0–1 shifts the average criterion score. */
export function buildRolePlay(rng: Rng, scenarioKey: string, quality: number): RolePlayDraft {
  const scenario = ROLEPLAY_SCENARIOS.find((s) => s.key === scenarioKey)
  const lines = LEARNER_LINES[scenarioKey]
  if (!scenario || !lines) throw new Error(`Unknown scenario ${scenarioKey}`)

  const learnerTurns = rng.int(4, 5)
  const transcript: TranscriptTurn[] = [{ speaker: 'visitor', text: scenario.visitorOpening }]
  for (let i = 0; i < learnerTurns; i++) {
    transcript.push({ speaker: 'learner', text: lines[i] as string })
    const followUp = scenario.visitorFollowUps[i]
    if (followUp && i < learnerTurns - 1) transcript.push({ speaker: 'visitor', text: followUp })
  }

  const scores = ROLEPLAY_RUBRIC.map(() =>
    Math.max(0, Math.min(4, Math.round(1.3 + quality * 2.7 + rng.float(-0.9, 0.9)))),
  )
  const criteria: CriterionFeedback[] = ROLEPLAY_RUBRIC.map((criterion, index) => {
    const score = scores[index] as number
    const [low, high] = SUGGESTIONS[criterion.key] as readonly [string, string]
    return {
      key: criterion.key,
      score,
      evidence: lines[Math.min(index, learnerTurns - 1)] as string,
      suggestion: score >= 3 ? high : low,
    }
  })

  return {
    transcript,
    scores,
    total: scores.reduce((sum, value) => sum + value, 0),
    feedback: {
      criteria,
      strength: rng.pick(STRENGTHS),
      improve: rng.pick(IMPROVE),
      retry: 'Ask one question about timing before presenting options.',
    },
  }
}

const SENTENCES = [
  'Thank you for letting me know that your plans have changed, and I am sorry for the disappointment.',
  'Could you tell me what matters most to you today, and how much time you have?',
  'I can offer two options that I have checked with the venue, so you do not need to search yourself.',
  'The first option keeps the same experience on another day, and the second is a similar activity this afternoon.',
  'If neither option suits you, I will pass your request to my supervisor and explain the next step.',
  'I will send you a short message by the end of the day to confirm what we agreed.',
  'Please let me know if you need step-free access or any other support so I can arrange it.',
  'I will check availability from the official source before I confirm anything.',
  'To make sure I explained this clearly, would you like me to repeat the steps?',
  'Thank you for your patience, and I will follow up with you personally.',
]

/** Plain text of exactly `words` words, built from the sentence bank. */
export function sampleResponseText(rng: Rng, words: number): string {
  const out: string[] = []
  while (out.length < words) {
    out.push(...rng.pick(SENTENCES).split(' '))
  }
  const text = out.slice(0, words).join(' ')
  return text.endsWith('.') ? text : `${text}.`
}

export const REVIEW_FEEDBACK_RETURNED = [
  'Good structure, but the escalation path is missing. Add who you would involve and when.',
  'Your two options are clear. Please add a follow-up message and say when it will be sent.',
  'Discovery questions need to come before the options. Revise the order and resubmit.',
  'Add detail on how you would verify availability before promising an alternative.',
]

export const REVIEW_FEEDBACK_APPROVED = [
  'Clear, practical and well organised. The follow-up message is especially strong.',
  'Good discovery questions and two feasible options. Tighten the escalation path next time.',
  'Professional tone and a realistic plan. Approved.',
  'Specific and respectful. A great example of verifying before promising.',
]
