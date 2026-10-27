import { BookOpenText, LineChart, MessagesSquare, Presentation } from 'lucide-react'

/** Homepage copy (brief §2). Headings, hero and button labels are verbatim from the brief. */

export const HERO = {
  headline: 'Build the skills to create memorable visitor experiences.',
  body: 'Explore flexible learning, practise real situations and progress through a journey shaped around your role.',
  primary: 'Explore programmes',
  secondary: 'Start your journey',
}

export const HERO_SLIDES = [
  { src: '/images/official/westbay-skyline-007.jpg', alt: 'West Bay skyline in Doha at dusk' },
  {
    src: '/images/official/museum-family.jpg',
    alt: 'A family walking at the National Museum of Qatar',
  },
  {
    src: '/images/official/dhow-boat-min.jpg',
    alt: 'A family on a dhow with the Museum of Islamic Art behind them',
  },
  { src: '/images/official/qatar-tourism-banner.jpg', alt: 'Guests dining together on a terrace' },
] as const

export type BenefitKey = 'pace' | 'ai' | 'trainers' | 'progress'

export const BENEFITS = [
  {
    key: 'pace',
    title: 'Learn at your pace',
    body: 'Short video lessons and interactive modules you can pause, resume and revisit when it suits your shifts.',
    icon: BookOpenText,
    image: '/images/official/grid-qatar-national-library-2-7740-wip-5.jpg',
  },
  {
    key: 'ai',
    title: 'Practise with AI',
    body: 'Rehearse real visitor conversations by text or voice and get specific feedback after every attempt.',
    icon: MessagesSquare,
    image: null,
  },
  {
    key: 'trainers',
    title: 'Learn with expert trainers',
    body: 'Join in-person or live-online sessions where Academy trainers coach and score your practice.',
    icon: Presentation,
    image: '/images/official/element-west-bay-13.jpg',
  },
  {
    key: 'progress',
    title: 'Track your progress',
    body: 'See your starting point, your improvement and your next step on one clear dashboard.',
    icon: LineChart,
    image: null,
  },
] as const satisfies readonly {
  key: BenefitKey
  title: string
  body: string
  icon: unknown
  image: string | null
}[]

export const STEPS = [
  {
    title: 'Create your profile',
    body: 'Tell us about your role, organisation and goals. Your profile helps us recommend relevant learning.',
    image: '/images/official/waldorf-astoria-doha-west-bay-2.jpg',
    alt: 'A hotel lobby lounge',
  },
  {
    title: 'Check your starting point',
    body: 'Answer five short scenario questions. The baseline shows where to focus and is never an entry barrier.',
    image: '/images/official/book-couples.jpg',
    alt: 'Visitors under a glass dome',
  },
  {
    title: 'Follow your learning path',
    body: 'Work through the units recommended for your role: video, interactive modules and practical resources.',
    image: '/images/official/tour-operator.jpg',
    alt: 'The Pearl marina at sunset from above',
  },
  {
    title: 'Practise and complete',
    body: 'Rehearse with AI, join a trainer session where your programme asks for one, then measure your improvement.',
    image: '/images/official/al-hazm-0024.jpg',
    alt: 'A family visiting Al Hazm',
  },
] as const

export const PROGRAMME_REQUIREMENTS = [
  {
    code: 'A',
    text: 'Two levels with a trainer-led session, a practical assignment, pre and post assessments and a demonstration certificate.',
  },
  {
    code: 'B',
    text: 'One self-paced stage with a pre-assessment, practice, a short response and a post-assessment. No certificate.',
  },
  {
    code: 'C',
    text: 'An illustrative sample overview only, with a short preview and no requirements.',
  },
] as const

export const FAQ = [
  {
    q: 'How are the programmes different?',
    a: 'Program A, Tourism Service Professional, is a two-level hybrid route with trainer-led sessions, a practical assignment and a demonstration certificate. Program B, Visitor Service Essentials, is one self-paced stage of short lessons and practice that measures your improvement, without a certificate. Program C, Destination Storytelling, is an illustrative sample of a possible future offering.',
  },
  {
    q: 'What is the difference between self-paced and live learning?',
    a: 'Self-paced units are videos, interactive modules and resources you complete whenever suits you, and you can resume where you stopped. Live learning happens in scheduled trainer sessions, in person or online, shown with the date and Qatar time. Program A includes one required session; Program B sessions are optional clinics.',
  },
  {
    q: 'Do I receive a certificate?',
    a: 'Program A issues a watermarked demonstration certificate once every requirement is met: assessments, attendance and a session score, and the practical assignment. It is a training completion record, not a guide licence. Program B and the Program C sample do not issue certificates.',
  },
  {
    q: 'How do I access my account?',
    a: 'Create an account with your email and a password, confirm your email through the demo verification step, then complete a short profile. Trainers and Academy administrators use accounts provided by the Academy. Choosing the trainer or admin sign-in mode never grants those roles.',
  },
  {
    q: 'Where can I get help?',
    a: 'Each portal page explains what to do next, and every session lists its trainer and location. In this demonstration, Help requests go to the Academy team running the walkthrough.',
  },
] as const
