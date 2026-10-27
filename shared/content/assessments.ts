import type { Competency } from '../constants/enums'

/**
 * Five-question baseline and parallel post assessment (brief §8). One item per competency,
 * equally weighted (0 or 20). The correct answer is B in every item; answer order is shuffled
 * when displayed, so `key` identifies an option, never its position.
 */

export type AnswerOption = { key: 'A' | 'B' | 'C'; text: string }

export type AssessmentQuestion = {
  competency: Competency
  competencyLabel: string
  /** Scenario stem shown to the learner. */
  prompt: string
  options: readonly AnswerOption[]
  correct: 'B'
}

export type AssessmentVariant = 'baseline' | 'post'

export const COMPETENCY_LABELS: Record<Competency, string> = {
  discover_needs: 'Discover needs',
  verify_information: 'Verify information',
  communicate_clearly: 'Communicate clearly',
  recover_service: 'Recover service',
  protect_information: 'Protect information',
}

export const ASSESSMENT_VERSION = 'v1'

export const BASELINE_QUESTIONS: readonly AssessmentQuestion[] = [
  {
    competency: 'discover_needs',
    competencyLabel: COMPETENCY_LABELS.discover_needs,
    prompt: 'A visitor is unsure what to do.',
    options: [
      { key: 'A', text: 'List every attraction' },
      { key: 'B', text: 'Ask about interests and available time' },
      { key: 'C', text: 'Select the most expensive option' },
    ],
    correct: 'B',
  },
  {
    competency: 'verify_information',
    competencyLabel: COMPETENCY_LABELS.verify_information,
    prompt: 'You are unsure about opening hours.',
    options: [
      { key: 'A', text: 'Guess' },
      { key: 'B', text: 'Verify from an authorised source' },
      { key: 'C', text: 'Promise access' },
    ],
    correct: 'B',
  },
  {
    competency: 'communicate_clearly',
    competencyLabel: COMPETENCY_LABELS.communicate_clearly,
    prompt: 'A visitor seems confused.',
    options: [
      { key: 'A', text: 'Repeat louder' },
      { key: 'B', text: 'Use plain language and check understanding' },
      { key: 'C', text: 'End the conversation' },
    ],
    correct: 'B',
  },
  {
    competency: 'recover_service',
    competencyLabel: COMPETENCY_LABELS.recover_service,
    prompt: 'A booking changes unexpectedly.',
    options: [
      { key: 'A', text: 'Blame the visitor' },
      { key: 'B', text: 'Acknowledge and offer feasible options' },
      { key: 'C', text: 'Promise an unapproved refund' },
    ],
    correct: 'B',
  },
  {
    competency: 'protect_information',
    competencyLabel: COMPETENCY_LABELS.protect_information,
    prompt: "A third party asks for another learner's phone number.",
    options: [
      { key: 'A', text: 'Share it' },
      { key: 'B', text: 'Use an authorised contact route' },
      { key: 'C', text: 'Post the list' },
    ],
    correct: 'B',
  },
]

/**
 * Post variants change the scenario while testing the same skill (brief §8). The brief gives the
 * scenario for each post item but not its options; the options below keep the same A/B/C
 * structure, so B remains the correct answer.
 */
export const POST_QUESTIONS: readonly AssessmentQuestion[] = [
  {
    competency: 'discover_needs',
    competencyLabel: COMPETENCY_LABELS.discover_needs,
    prompt: 'A family has limited time. What do you do before recommending anything?',
    options: [
      { key: 'A', text: 'Recommend the busiest attraction' },
      { key: 'B', text: 'Ask about their priorities, then recommend' },
      { key: 'C', text: 'Give them a long printed list' },
    ],
    correct: 'B',
  },
  {
    competency: 'verify_information',
    competencyLabel: COMPETENCY_LABELS.verify_information,
    prompt: 'Availability for a tour is uncertain.',
    options: [
      { key: 'A', text: 'Confirm it so the visitor feels reassured' },
      { key: 'B', text: 'Verify availability before confirming' },
      { key: 'C', text: 'Say it is probably fine' },
    ],
    correct: 'B',
  },
  {
    competency: 'communicate_clearly',
    competencyLabel: COMPETENCY_LABELS.communicate_clearly,
    prompt: 'You need to explain a meeting point to a visitor.',
    options: [
      { key: 'A', text: 'Point and say it is over there' },
      { key: 'B', text: 'Give clear steps, then confirm they understood' },
      { key: 'C', text: 'Send them a map and leave' },
    ],
    correct: 'B',
  },
  {
    competency: 'recover_service',
    competencyLabel: COMPETENCY_LABELS.recover_service,
    prompt: 'A service is delayed. How do you respond?',
    options: [
      { key: 'A', text: 'Say delays are not your department' },
      { key: 'B', text: 'Acknowledge the impact and explain realistic choices' },
      { key: 'C', text: 'Offer a discount you have not been authorised to give' },
    ],
    correct: 'B',
  },
  {
    competency: 'protect_information',
    competencyLabel: COMPETENCY_LABELS.protect_information,
    prompt: 'A trainer needs to contact a learner.',
    options: [
      { key: 'A', text: 'Give the trainer the learner’s personal number' },
      { key: 'B', text: 'Use the permitted platform channel' },
      { key: 'C', text: 'Post the learner’s details in a group chat' },
    ],
    correct: 'B',
  },
]

export const QUESTION_BANK: Record<AssessmentVariant, readonly AssessmentQuestion[]> = {
  baseline: BASELINE_QUESTIONS,
  post: POST_QUESTIONS,
}

/** Result copy: baseline explains the result without coaching the exact post answers. */
export const ASSESSMENT_RESULT_COPY = {
  baselineIntro:
    'This baseline identifies useful learning and is not an entry barrier. It does not reveal the post-assessment answers.',
} as const

/** Sample branching interaction (brief §8), used by the C02 package and the SCORM sample. */
export const BRANCHING_INTERACTION = {
  id: 'c02-activity-unavailable',
  visitorLine: 'Our planned activity is unavailable and we only have two hours.',
  choices: [
    { key: 'A', text: 'Promise the original activity anyway', correct: false },
    {
      key: 'B',
      text: 'Ask about interests and accessibility needs, then offer two verified alternatives',
      correct: true,
    },
    { key: 'C', text: 'Tell them to search online', correct: false },
  ],
  correctFeedback: 'You clarified the need and offered realistic choices.',
  /** Brief gives feedback only for the correct choice; these are original, neutral wording. */
  incorrectFeedback: {
    A: 'Promising something you cannot confirm risks a second disappointment. Try again.',
    C: 'Sending the visitor away leaves their need unmet. Try again.',
  },
  next: 'Continue to choosing an option and confirming the next step.',
  /** What the package records: each choice made and the final score. */
  records: ['choices', 'finalScore'],
} as const

/** Competency scores for a set of selected options: 20 points per correct item. */
export function scoreAnswers(
  variant: AssessmentVariant,
  selected: Partial<Record<Competency, 'A' | 'B' | 'C'>>,
): { total: number; byCompetency: Record<Competency, number> } {
  const byCompetency = {} as Record<Competency, number>
  let total = 0
  for (const question of QUESTION_BANK[variant]) {
    const points = selected[question.competency] === question.correct ? 20 : 0
    byCompetency[question.competency] = points
    total += points
  }
  return { total, byCompetency }
}
