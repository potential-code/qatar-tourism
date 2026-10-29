import { BRANCHING_INTERACTION } from '@shared/content/assessments'

/**
 * In-unit activities for the sample curriculum (brief §7–8). Original fictional demonstration
 * content. The progress service grades the C03 formative questions, so their answers stay in the
 * service layer and are never returned to the UI.
 */

/** C02 branching preview: the brief's scenario, then choosing an option and confirming it. */
export const C02_PREVIEW = {
  label: 'Preview',
  formatNote: 'Branching HTML preview. Not a verified SCORM package.',
  family: 'A family of four is choosing an activity at the visitor desk.',
  visitorLine: BRANCHING_INTERACTION.visitorLine,
  choices: BRANCHING_INTERACTION.choices.map((choice) => ({
    key: choice.key,
    text: choice.text,
    correct: choice.correct,
    feedback: choice.correct
      ? BRANCHING_INTERACTION.correctFeedback
      : BRANCHING_INTERACTION.incorrectFeedback[choice.key as 'A' | 'C'],
  })),
  next: BRANCHING_INTERACTION.next,
  options: [
    {
      key: 'museum' as const,
      title: 'A guided museum visit',
      detail:
        'A 75-minute family tour with step-free access, starting in 20 minutes. Availability confirmed with the venue desk.',
    },
    {
      key: 'dhow' as const,
      title: 'A short dhow cruise',
      detail:
        'A 60-minute bay cruise with seats held until 15:00. Boarding ramp available. Availability confirmed with the operator.',
    },
  ],
  confirm: [
    {
      key: 'confirm' as const,
      text: 'Confirm the booking, give the meeting point and time, and check they know what to do next',
      correct: true,
      feedback: 'Clear next step. The family knows where to go, when, and who to ask.',
    },
    {
      key: 'leave' as const,
      text: 'Hand over a leaflet and wish them a good day',
      correct: false,
      feedback:
        'The family still has to work out the next step alone. Try confirming it with them.',
    },
  ],
} as const

export type FormativeQuestion = {
  id: 'c03-q1' | 'c03-q2' | 'c03-q3'
  prompt: string
  options: { key: 'A' | 'B' | 'C'; text: string }[]
  correct: 'A' | 'B' | 'C'
  feedback: { correct: string; incorrect: string }
}

/** C03: three formative questions after the video (brief §7). */
export const C03_QUESTIONS: readonly FormativeQuestion[] = [
  {
    id: 'c03-q1',
    prompt:
      'A visitor looks unsure after your directions. What is the best way to check understanding?',
    options: [
      { key: 'A', text: 'Ask "Is that clear?" and move on' },
      { key: 'B', text: 'Invite them to repeat the key step back to you' },
      { key: 'C', text: 'Repeat the directions faster' },
    ],
    correct: 'B',
    feedback: {
      correct:
        'Inviting a short repeat-back confirms the key step without putting the visitor on the spot.',
      incorrect:
        'A yes or no question often hides confusion. Try a way that shows what they understood.',
    },
  },
  {
    id: 'c03-q2',
    prompt: 'Which sentence uses plain language?',
    options: [
      { key: 'A', text: 'Proceed to the designated rendezvous point adjacent to Gate 3.' },
      { key: 'B', text: 'Please meet your guide next to Gate 3, by the blue sign.' },
      { key: 'C', text: 'Head to the RV at G3 per the itinerary.' },
    ],
    correct: 'B',
    feedback: {
      correct: 'Short, familiar words and a visible landmark make the step easy to follow.',
      incorrect:
        'Jargon and abbreviations slow visitors down. Look for everyday words and a landmark.',
    },
  },
  {
    id: 'c03-q3',
    prompt: 'How do you ask about accessibility preferences respectfully?',
    options: [
      {
        key: 'A',
        text: 'Ask whether anything would make the visit more comfortable, and offer options',
      },
      { key: 'B', text: 'Assume what the visitor needs from how they look' },
      { key: 'C', text: 'Avoid the topic so nobody feels uncomfortable' },
    ],
    correct: 'A',
    feedback: {
      correct: 'An open, respectful question lets the visitor share only what they choose to.',
      incorrect: 'Assumptions and silence both create barriers. Ask openly and offer choices.',
    },
  },
]

/** C05: the one-page response checklist (brief §7). */
export const C05_CHECKLIST = [
  { key: 'acknowledge', label: 'Acknowledge the change and its impact on the visitor' },
  { key: 'discover', label: 'Ask one or two discovery questions about time and priorities' },
  { key: 'verify', label: 'Verify availability before offering anything' },
  { key: 'options', label: 'Offer two feasible, confirmed options' },
  { key: 'escalate', label: 'Know when and to whom you escalate' },
  { key: 'followup', label: 'Confirm the next step and a follow-up message' },
] as const

export const C05_MIN_DRAFT_WORDS = 30

export const C07_PREVIEW = {
  label: 'Sample overview',
  steps: [
    'Choose one place and one visitor you are speaking to.',
    'Pick a single memorable detail and why it matters.',
    'Close with a clear suggestion of what to see next.',
  ],
} as const

export const MEDIA: Record<'C01' | 'C03', { src: string; captions: string; poster: string }> = {
  C01: {
    src: '/media/c01-welcoming-every-visitor.mp4',
    captions: '/media/c01-welcoming-every-visitor.en.vtt',
    poster: '/media/c01-poster.jpg',
  },
  C03: {
    src: '/media/c03-clear-and-inclusive-communication.mp4',
    captions: '/media/c03-clear-and-inclusive-communication.en.vtt',
    poster: '/media/c03-poster.jpg',
  },
}

/** Transcript of the C03 sample video (original demo narration). */
export const C03_TRANSCRIPT =
  'Clear communication helps every visitor feel welcome. Use plain language and short sentences. Avoid jargon and local abbreviations. Ask about any accessibility preferences respectfully, and offer options such as written directions or a quieter meeting point. Speak at a steady pace and face the visitor. Check understanding by inviting them to repeat the key step, not only by asking whether they understood. Inclusive communication removes barriers so every visitor can take part.'
