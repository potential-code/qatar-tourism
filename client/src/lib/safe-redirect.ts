/**
 * Only follow same-origin, path-only redirects. `?redirect=https://evil.example` or
 * `//evil.example` must not turn the login page into an open redirect.
 */
export function safeRedirect(target: string | undefined, fallback = '/dashboard'): string {
  const isLocalPath =
    target?.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')
  return isLocalPath && target ? target : fallback
}
