import type { Competency } from '../constants/enums'

/**
 * Role-play scenarios (brief §9). Scripted, deterministic "Simulated AI practice": the visitor
 * lines below drive the 4–6 turn conversation. Difficulty and duration are demo estimates.
 */

export type RolePlayScenario = {
  key: string
  title: string
  visitorOpening: string
  learnerObjective: string
  competency: Competency
  difficulty: 'Introductory' | 'Intermediate' | 'Advanced'
  estimatedMinutes: number
  /** Scripted visitor follow-ups, one per learner turn after the opening. */
  visitorFollowUps: readonly string[]
}

export const ROLEPLAY_SCENARIOS: readonly RolePlayScenario[] = [
  {
    key: 'changed-booking',
    title: 'Changed booking',
    visitorOpening:
      'I booked this experience for today and now I am told it is unavailable. What can you do?',
    learnerObjective:
      'Acknowledge, clarify constraints, propose two feasible options and confirm follow-up.',
    competency: 'recover_service',
    difficulty: 'Intermediate',
    estimatedMinutes: 6,
    visitorFollowUps: [
      'We only have the afternoon free, and there are four of us.',
      'Those options sound possible. Which one would you suggest?',
      'Fine. What happens if that one also falls through?',
      'Okay. Can you confirm what happens next?',
      'Thank you. I feel a little better about it.',
    ],
  },
  {
    key: 'unclear-directions',
    title: 'Unclear directions',
    visitorOpening: 'I am lost and worried I will miss the meeting point.',
    learnerObjective:
      'Ask current location without requesting unnecessary personal data; give clear verified instructions and check understanding.',
    competency: 'communicate_clearly',
    difficulty: 'Introductory',
    estimatedMinutes: 5,
    visitorFollowUps: [
      'I am near a large fountain, I think. There is a coffee shop opposite.',
      'Walk past the coffee shop and then where? I am getting confused.',
      'Okay, let me repeat that back to you.',
      'That makes sense. Thank you for being patient.',
    ],
  },
  {
    key: 'accessibility-preference',
    title: 'Accessibility preference',
    visitorOpening: 'We want to join, but one person in our group needs step-free access.',
    learnerObjective:
      'Ask respectfully about requirements, verify suitability and offer an appropriate alternative if uncertain.',
    competency: 'discover_needs',
    difficulty: 'Intermediate',
    estimatedMinutes: 6,
    visitorFollowUps: [
      'She uses a wheelchair and cannot manage steps or long uneven paths.',
      'So is the route suitable, or not?',
      'An alternative would be welcome. What would you suggest?',
      'Please confirm that you will check and come back to us.',
      'Thank you for taking this seriously.',
    ],
  },
  {
    key: 'group-running-late',
    title: 'Group running late',
    visitorOpening: 'Half our group has not arrived and we do not want to lose our session.',
    learnerObjective:
      'Clarify the situation, explain the stated demo policy and escalate without inventing exceptions.',
    competency: 'protect_information',
    difficulty: 'Advanced',
    estimatedMinutes: 6,
    visitorFollowUps: [
      'They are about twenty minutes away. Can you hold the session?',
      'Surely you can make an exception just this once?',
      'Who decides that, and how long will it take?',
      'Okay. Please let us know as soon as you hear.',
      'Understood. Thank you for being straightforward.',
    ],
  },
]

export const SIMULATED_AI_LABEL = 'Simulated AI practice'
export const DEMO_ANALYTICS_LABEL = 'Demo analytics assistant'
