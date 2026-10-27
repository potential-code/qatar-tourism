/**
 * Scripted visitor branches for "Simulated AI practice" (brief §9). The spine of each
 * conversation is the scenario's `visitorFollowUps` (shared/content/scenarios.ts); the lines
 * here are what the visitor says instead when the learner's reply carries a signal worth
 * reacting to, so the scripted demo feels responsive. All content is fictional.
 */

export const BRANCH_KEYS = [
  'dismissive',
  'personalData',
  'overpromise',
  'noEmpathyOpening',
  'noQuestionOpening',
  'noOptions',
] as const
export type BranchKey = (typeof BRANCH_KEYS)[number]

const DEFAULT_BRANCHES: Record<BranchKey, string> = {
  dismissive:
    'That is not very helpful. I came to you because I need someone to help me sort this out.',
  personalData: 'Why would you need that? I would rather not share it. I just need some help.',
  overpromise: 'Can you really promise that? I do not want to be let down twice today.',
  noEmpathyOpening: 'Before we go on, do you understand how stressful this is for us?',
  noQuestionOpening: 'You have not asked anything about our situation yet.',
  noOptions: 'So what can we actually do? I still do not know what my choices are.',
}

const SCENARIO_BRANCHES: Record<string, Partial<Record<BranchKey, string>>> = {
  'changed-booking': {
    noEmpathyOpening:
      'Before we go on, do you understand how disappointing this is? We planned our day around it.',
    noQuestionOpening: 'You have not asked what would actually work for us.',
  },
  'unclear-directions': {
    personalData:
      'Do you really need that? I would rather not share it. I just need to find the meeting point.',
    overpromise: 'Are you sure? I really cannot afford to get this wrong.',
    noEmpathyOpening: 'I am really anxious about this. I do not want to miss it.',
    noQuestionOpening: 'But you do not know where I am yet. Should you not ask me first?',
    dismissive: 'I already tried that and it did not help. Please, can you just guide me?',
  },
  'accessibility-preference': {
    personalData: 'Why do you need her medical details? I have told you what she needs.',
    overpromise: 'Are you certain? Last time we were told it was fine and it was not.',
    noQuestionOpening: 'Do you not want to know what she needs first?',
  },
  'group-running-late': {
    overpromise: 'Really? I want to be sure that is actually allowed before I tell the others.',
    noEmpathyOpening:
      'This is stressful. We planned this for weeks and half of us are stuck in traffic.',
    noQuestionOpening: 'Do you not want to know how far away they are?',
  },
}

export function branchLine(scenarioKey: string, key: BranchKey): string {
  return SCENARIO_BRANCHES[scenarioKey]?.[key] ?? DEFAULT_BRANCHES[key]
}

/** Short reactions the visitor puts before the next scripted line, each used at most once. */
export const REACTIONS = {
  acknowledge: 'Thank you, I appreciate that.',
  options: 'Okay, that helps.',
  verify: 'Thank you for checking.',
  checkUnderstanding: 'Yes, that is clear.',
} as const
export type ReactionKey = keyof typeof REACTIONS

/**
 * Learner replies for the clearly labelled prerecorded demonstration, used when the
 * microphone is denied or speech services are unavailable (brief §1, §9).
 */
export const DEMONSTRATION_REPLIES: Record<string, readonly string[]> = {
  'changed-booking': [
    'I am sorry, that is really disappointing when you planned your day around it. May I ask how much time you have today and how many people are in your group?',
    'Thank you. Let me check what is available this afternoon for four people. I can see two options: a guided heritage walk at 3pm, or the same experience tomorrow morning.',
    'If you want to keep today free, the heritage walk is a good fit. I will verify the seats with my colleague before I confirm anything.',
    'If it falls through, I will escalate to the duty manager and offer the tomorrow morning slot instead. I will not promise anything I cannot confirm.',
    'To confirm: I will check the 3pm walk now and message you within 15 minutes with the booking details. Does that work for you?',
  ],
  'unclear-directions': [
    'I understand, that is worrying. Could you tell me what you can see around you right now?',
    'Thank you. First, walk past the coffee shop with the fountain behind you. Then turn left at the bookshop. The meeting point is the blue sign straight ahead.',
    'Of course. First the coffee shop, then left at the bookshop, then straight ahead to the blue sign. Could you repeat that back to me?',
    'That is right. I have also checked with the guide, and they will wait at the sign. If you would rather not walk, another option is the shuttle stop on your left.',
    'You are welcome. I will message the guide now to let them know you are on your way. Does that make sense?',
  ],
  'accessibility-preference': [
    'Thank you for telling us, we want everyone to enjoy it. May I ask what kind of access she needs, so I can check properly?',
    'Thank you. I will verify the route with the operations team before I confirm, because I do not want to guess.',
    'I am not certain the full route is step-free, so let me check. If it is not suitable, an alternative is the accessible gallery tour, or a later session on the level route.',
    'Yes. I will check with the team and come back to you within 20 minutes with a clear answer. Is this the best way to reach you through the booking?',
    'Thank you for your patience. I will follow up as promised.',
  ],
  'group-running-late': [
    'I understand, that is stressful. How far away is the rest of the group, and how many people are still on the way?',
    'Thank you. Under the stated demo policy, changes within 24 hours need an admin review, so I cannot hold the session myself.',
    'I am not able to make an exception, but I can escalate it to the duty manager right now and ask whether the late arrivals can join.',
    'The duty manager decides. I will message you within 10 minutes with their answer. In the meantime, the people who are here can start.',
    'You are welcome. I will keep you updated as soon as I hear back.',
  ],
}
