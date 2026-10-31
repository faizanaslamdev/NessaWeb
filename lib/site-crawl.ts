/**
 * What crawlers may fetch (robots.txt) and the static pages we list in the
 * sitemap — kept together so the sitemap never lists a disallowed URL.
 */

/** Live chat rooms, auth handlers and dashboards aren't content pages. */
export const ROBOTS_DISALLOW = ['/chat', '/auth', '/__/', '/account', '/business', '/admin'] as const

/** Indexable public pages (Places are added from the slug index). */
export const SITEMAP_STATIC_PATHS = [
  '/',
  '/places',
  '/about',
  '/for-businesses',
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
  '/acceptable-use',
] as const

/** robots.txt prefix match (no wildcards are used in ROBOTS_DISALLOW). */
export function isDisallowedByRobots(path: string): boolean {
  return ROBOTS_DISALLOW.some(prefix => path.startsWith(prefix))
}
