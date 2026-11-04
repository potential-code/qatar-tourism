import type { ProgrammeCode, SessionFormat } from '@shared/constants'
import { uniqueDemoEmail } from '@shared/utils/identity'
import { stableUuid, trainerCode, userIds } from './ids'

/** Trainer addresses already handed out, so two trainers never share one. */
const trainerEmails = new Set<string>()

/**
 * The ten fictional trainers and their upcoming sessions (brief §16).
 *
 * Deviation: the brief names T04 "Daniel Costa", the same name as learner persona L0004. T04 is
 * "Rafael Sousa" here (Hospitality trainer, English and Portuguese). See docs/DECISIONS.md.
 */
export type TrainerSeed = {
  n: number
  id: string
  userId: string
  code: string
  email: string
  fullName: string
  headline: string
  bio: string
  expertise: string[]
  languages: string[]
  approvedProgrammes: ProgrammeCode[]
  /** The §16 "upcoming sample session" row. */
  upcoming: {
    title: string
    programme: ProgrammeCode
    optional: boolean
    format: SessionFormat
    day: number
    time: string
    venue: string
    capacity: number
    description: string
  }
  /** Day offsets for the completed (-14..-5) and later (+9..+18) sessions. */
  completedDay: number
  laterDay: number
}

const ROOM_ONLINE = 'Demo room'

export const TRAINERS: readonly TrainerSeed[] = (
  [
    {
      name: 'Amal Al Nouri',
      headline: 'Visitor service coach',
      languages: ['Arabic', 'English'],
      bio: 'Amal coaches front-line teams on warm, confident visitor welcomes. She has designed greeting practice labs for fictional hotel and attraction teams.',
      expertise: ['Visitor welcome', 'Service coaching', 'Greeting practice'],
      programmes: ['A'],
      title: 'Welcoming every visitor',
      programme: 'A',
      optional: false,
      format: 'in_person',
      day: 2,
      time: '09:00',
      venue: 'Demo Academy Room 1',
      capacity: 24,
      description:
        'Practise the greet, ask, listen and next-step pattern from the C01 video in pairs, with live coaching and feedback.',
    },
    {
      name: 'Khalid Mansour',
      headline: 'Tour guiding facilitator',
      languages: ['Arabic', 'English'],
      bio: 'Khalid facilitates guiding practice for fictional tour operators, with a focus on clear spoken communication on the move.',
      expertise: ['Tour guiding', 'Spoken communication', 'Group management'],
      programmes: ['A'],
      title: 'Practical visitor communication',
      programme: 'A',
      optional: false,
      format: 'online',
      day: 2,
      time: '14:00',
      venue: ROOM_ONLINE,
      capacity: 30,
      description:
        'A live-online workshop on plain language, checking understanding and handling unclear requests, with scored role-play in breakout pairs.',
    },
    {
      name: 'Leila Haddad',
      headline: 'Service recovery trainer',
      languages: ['Arabic', 'English'],
      bio: 'Leila trains teams to turn a difficult service moment into a calm, constructive conversation. Her scenarios are fictional and drawn from common visitor-service situations.',
      expertise: ['Service recovery', 'Complaint handling', 'Escalation'],
      programmes: ['A'],
      title: 'Handling a changed booking',
      programme: 'A',
      optional: false,
      format: 'in_person',
      day: 3,
      time: '10:00',
      venue: 'Demo Academy Room 2',
      capacity: 20,
      description:
        'Role-play a visitor whose booking has changed: acknowledge, clarify constraints, offer two feasible options and confirm the follow-up.',
    },
    {
      name: 'Rafael Sousa',
      headline: 'Hospitality trainer',
      languages: ['English', 'Portuguese'],
      bio: 'Rafael has a background in fictional boutique hotels and now trains guest-facing teams in practical, friendly service routines.',
      expertise: ['Hospitality service', 'Guest relations', 'Front office practice'],
      programmes: ['A'],
      title: 'Guest service practice',
      programme: 'A',
      optional: false,
      format: 'online',
      day: 3,
      time: '15:00',
      venue: ROOM_ONLINE,
      capacity: 30,
      description:
        'Guided guest-service practice in a live-online room: scripted visitors, peer feedback and a scored demonstration.',
    },
    {
      name: 'Noura Al Saleh',
      headline: 'Inclusive communication coach',
      languages: ['Arabic', 'English'],
      bio: 'Noura coaches inclusive, respectful visitor conversations, including how to ask about access needs without assumptions.',
      expertise: ['Inclusive communication', 'Accessibility awareness', 'Plain language'],
      programmes: ['A'],
      title: 'Inclusive visitor conversations',
      programme: 'A',
      optional: false,
      format: 'in_person',
      day: 4,
      time: '09:00',
      venue: 'Demo Academy Room 1',
      capacity: 24,
      description:
        'Practise asking respectfully about access needs, verifying suitability and offering alternatives when you are not sure.',
    },
    {
      name: 'Priya Menon',
      headline: 'Front office learning facilitator',
      languages: ['English', 'Hindi'],
      bio: 'Priya facilitates short, practical clinics for front office teams. Her sessions are optional drop-ins for Program B learners.',
      expertise: ['Front office', 'Visitor response writing', 'Feedback clinics'],
      programmes: ['B'],
      title: 'Visitor response clinic',
      programme: 'B',
      optional: true,
      format: 'online',
      day: 4,
      time: '13:00',
      venue: ROOM_ONLINE,
      capacity: 40,
      description:
        'An optional drop-in clinic to polish your short visitor response with a trainer and peers. Not required for Program B completion.',
    },
    {
      name: 'Youssef Karim',
      headline: 'Group experience trainer',
      languages: ['Arabic', 'French'],
      bio: 'Youssef trains teams who look after groups, from arrival through the last goodbye, with a focus on managing expectations kindly and clearly.',
      expertise: ['Group experiences', 'Expectation setting', 'Time management'],
      programmes: ['A'],
      title: 'Managing group expectations',
      programme: 'A',
      optional: false,
      format: 'in_person',
      day: 5,
      time: '10:00',
      venue: 'Demo Training Studio',
      capacity: 20,
      description:
        'Practise explaining the stated policy to a group running late and escalating without inventing exceptions.',
    },
    {
      name: 'Sofia Martins',
      headline: 'Destination storytelling coach',
      languages: ['English', 'Portuguese'],
      bio: 'Sofia coaches short, vivid destination stories. Her sessions support the illustrative Program C sample.',
      expertise: ['Destination storytelling', 'Story planning', 'Presentation'],
      programmes: ['C'],
      title: 'Storytelling preview clinic',
      programme: 'C',
      optional: true,
      format: 'online',
      day: 5,
      time: '14:00',
      venue: ROOM_ONLINE,
      capacity: 35,
      description:
        'A sample clinic for the illustrative Program C: plan a concise destination story with the C07 worksheet.',
    },
    {
      name: 'Hassan Farouk',
      headline: 'Transport service facilitator',
      languages: ['Arabic', 'English'],
      bio: 'Hassan works with fictional transport teams on giving clear directions and keeping visitors oriented. His sessions are optional for Program B learners.',
      expertise: ['Transport service', 'Clear directions', 'Wayfinding'],
      programmes: ['B'],
      title: 'Clear directions practice',
      programme: 'B',
      optional: true,
      format: 'online',
      day: 6,
      time: '09:00',
      venue: ROOM_ONLINE,
      capacity: 30,
      description:
        'An optional practice session on giving clear, verified directions and checking understanding. Not required for Program B completion.',
    },
    {
      name: 'Aisha Rahman',
      headline: 'Assessment and feedback coach',
      languages: ['English', 'Urdu'],
      bio: 'Aisha coaches learners on writing a professional response plan and marks practical assignments with specific, usable feedback.',
      expertise: ['Assessment', 'Written feedback', 'Response planning'],
      programmes: ['A', 'B'],
      title: 'Professional response workshop',
      programme: 'A',
      optional: false,
      format: 'in_person',
      day: 6,
      time: '13:00',
      venue: 'Demo Academy Room 3',
      capacity: 24,
      description:
        'Develop the C05 checklist into a 300–500 word response plan, with discovery questions, two options, an escalation path and a follow-up message.',
    },
  ] as const
).map((definition, index): TrainerSeed => {
  const n = index + 1
  return {
    n,
    id: stableUuid('trainer', n),
    userId: userIds.trainer(n),
    code: trainerCode(n),
    email: uniqueDemoEmail(definition.name, trainerEmails),
    fullName: definition.name,
    headline: definition.headline,
    bio: definition.bio,
    expertise: [...definition.expertise],
    languages: [...definition.languages],
    approvedProgrammes: [...definition.programmes] as ProgrammeCode[],
    upcoming: {
      title: definition.title,
      programme: definition.programme,
      optional: definition.optional,
      format: definition.format,
      day: definition.day,
      time: definition.time,
      venue: definition.venue,
      capacity: definition.capacity,
      description: definition.description,
    },
    // Completed Day -14..-5 (one per day, oldest first); later Day +9..+18.
    completedDay: -14 + index,
    laterDay: 9 + index,
  }
})

export const TRAINER_ORGANISATION = 'Demo Training Partners (fictional)'
