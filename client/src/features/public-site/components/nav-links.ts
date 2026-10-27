/** Header links in the brief's order (§2). Hash links scroll to homepage sections. */
export type PublicNavLink = { label: string; to: '/' | '/programmes' | '/sessions'; hash?: string }

export const NAV_LINKS: readonly PublicNavLink[] = [
  { label: 'Academy', to: '/', hash: 'academy' },
  { label: 'Programmes', to: '/programmes' },
  { label: 'How it works', to: '/', hash: 'how-it-works' },
  { label: 'Upcoming sessions', to: '/sessions' },
]
