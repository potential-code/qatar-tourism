/**
 * Header links (brief §2): each one scrolls to its homepage section, listed in the order the
 * sections appear on the page. From any other page they return to the homepage at that section.
 */
export type PublicNavLink = { label: string; hash: string }

export const NAV_LINKS: readonly PublicNavLink[] = [
  { label: 'Programmes', hash: 'programmes' },
  { label: 'Academy', hash: 'academy' },
  { label: 'How it works', hash: 'how-it-works' },
  { label: 'Upcoming sessions', hash: 'sessions' },
]
