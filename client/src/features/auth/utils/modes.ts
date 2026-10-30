/**
 * Sign-in modes (brief §3). A mode only changes the interface: copy, imagery and help text.
 * It never grants a role; after sign-in the account's real role decides where the user goes.
 * The words (tab, title, description, alt, note) are in the `auth` namespace under
 * `modes.<mode>.*`; trainer and admin carry an extra `note`.
 */
export const SIGN_IN_MODES = ['learner', 'trainer', 'admin'] as const
export type SignInMode = (typeof SIGN_IN_MODES)[number]

export const MODE_IMAGE: Record<SignInMode, string> = {
  learner: '/images/official/dhow-boat-min.jpg',
  trainer: '/images/official/element-west-bay-13.jpg',
  admin: '/images/official/westbay-skyline-007.jpg',
}
