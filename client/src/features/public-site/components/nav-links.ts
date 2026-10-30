/**
 * Header links (brief §2): each one scrolls to its homepage section, listed in the order the
 * sections appear on the page. From any other page they return to the homepage at that section.
 * `labelKey` is a key in the `public` namespace.
 */
export type PublicNavLink = {
  labelKey: 'nav.programmes' | 'nav.academy' | 'nav.howItWorks' | 'nav.sessions'
  hash: string
}

export const NAV_LINKS: readonly PublicNavLink[] = [
  { labelKey: 'nav.programmes', hash: 'programmes' },
  { labelKey: 'nav.academy', hash: 'academy' },
  { labelKey: 'nav.howItWorks', hash: 'how-it-works' },
  { labelKey: 'nav.sessions', hash: 'sessions' },
]
