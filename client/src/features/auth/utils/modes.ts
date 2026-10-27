import type { Role } from '@shared/roles'

/**
 * Sign-in modes (brief §3). A mode only changes the interface: copy, imagery and help text.
 * It never grants a role; after sign-in the account's real role decides where the user goes.
 */
export const SIGN_IN_MODES = ['learner', 'trainer', 'admin'] as const
export type SignInMode = (typeof SIGN_IN_MODES)[number]

export const MODE_COPY: Record<
  SignInMode,
  { tab: string; title: string; description: string; image: string; alt: string; note?: string }
> = {
  learner: {
    tab: 'Learner',
    title: 'Welcome back',
    description: 'Sign in to continue your learning journey.',
    image: '/images/official/dhow-boat-min.jpg',
    alt: 'A family on a dhow with the Museum of Islamic Art behind them',
  },
  trainer: {
    tab: 'Trainer',
    title: 'Trainer sign in',
    description: 'Open your trainer workspace: sessions, attendance, scoring and marking.',
    image: '/images/official/element-west-bay-13.jpg',
    alt: 'A hotel meeting room set up for training',
    note: 'Trainer access comes from an account provided by the Academy. Choosing this mode does not grant trainer access.',
  },
  admin: {
    tab: 'Academy admin',
    title: 'Academy admin sign in',
    description: 'Open the Academy Dashboard, AI Analytics, Reports and Academy Management.',
    image: '/images/official/westbay-skyline-007.jpg',
    alt: 'West Bay skyline in Doha at dusk',
    note: 'Administrator access comes from a pre-provisioned account. Choosing this mode does not grant administrator access.',
  },
}

export const ROLE_LABEL: Record<Role, string> = {
  learner: 'learner',
  trainer: 'trainer',
  admin: 'Academy admin',
}
