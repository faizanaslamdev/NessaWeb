/**
 * Place photo URLs on the web.
 *
 * - NessaChat photos (our Firebase Storage) are free to show anywhere: server
 *   HTML, cards, OG images.
 * - Google Places photos (key-bearing, billed per load, may not be cached)
 *   are not shown on the website at all: see lib/place-public-view.ts.
 */

/** True for images hosted by NessaChat (Firebase Storage, or its local emulator). */
export function isNessaPhotoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url.trim())
    if (u.protocol === 'https:' && u.host === 'firebasestorage.googleapis.com') return u.pathname.startsWith('/v0/b/')
    return u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost') && u.pathname.startsWith('/v0/b/')
  } catch {
    return false
  }
}

/**
 * The Place's NessaChat cover (small variant when `small`), or null when the
 * Place only has Google's photo. Dashboards, previews and claim pages use
 * this: they never load Google photos.
 */
export function nessaCoverUrl(
  landing: { coverImageUrl?: string; coverFeedUrl?: string; coverSource?: string } | null | undefined,
  small = false,
): string | null {
  if (!landing?.coverImageUrl) return null
  if (landing.coverSource !== 'nessa' && !isNessaPhotoUrl(landing.coverImageUrl)) return null
  return (small && landing.coverFeedUrl) || landing.coverImageUrl
}
