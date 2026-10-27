/**
 * Public Place URLs.
 *
 * Canonical public page: `https://www.nessachat.com/places/{slug}` — a clean,
 * permanent, human-readable slug that is independent of the Place's database
 * identity (its Google Place ID). Legacy `/place/{googlePlaceId}` URLs (all
 * QR codes printed before slugs existed) permanently redirect to it.
 *
 * Slug rules mirror NessaChat/functions/src/places/shared/placeSlug.ts.
 */

import { placeShareUrl } from '@/lib/constants'

/** Canonical public site origin for Place pages, QR codes and OG URLs. */
export const PLACE_PUBLIC_ORIGIN = 'https://www.nessachat.com'

export const PLACE_SLUG_MAX_LENGTH = 72

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidPlaceSlug(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  return (
    value.length >= 2 &&
    value.length <= PLACE_SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(value)
  )
}

export function placeCanonicalPath(slug: string): string {
  return `/places/${slug}`
}

export function placeCanonicalUrlForSlug(slug: string): string {
  return `${PLACE_PUBLIC_ORIGIN}${placeCanonicalPath(slug)}`
}

/**
 * TEMPORARY (until the slug-aware app release is widely installed): every link
 * we hand out — QR codes, Share, Copy Link — uses the legacy
 * `/place/{googlePlaceId}` URL instead of `/places/{slug}`.
 *
 * Why: the currently installed Android app claims every `/place*` path as an
 * App Link (manifest `pathPrefix="/place"` also matches `/places/…`) but can't
 * route slugs, so opening a slug link would land on the app's home screen.
 * Every app version handles the legacy id URL, and browsers get a 308 to the
 * canonical slug page — so the canonical URL is still `/places/{slug}` (and
 * that's what we display).
 *
 * Cutover (once the slug-aware app release is widely installed): flip this to
 * false and deploy the web — outbound links switch to slugs and the AASA
 * route starts listing '/places/*' automatically. Then flip the app's
 * `PLACE_LINKS_USE_LEGACY_ID_PATH` in its next release (never before the web).
 */
export const PLACE_LINKS_USE_LEGACY_ID_PATH = true

/** `ref` values we print on links/QRs we control (see place-link-source.ts). */
export type PlaceLinkRef = 'qr' | 'ig' | 'site' | 'app' | 'pre'

/**
 * Public URL for a Place: the clean slug URL when the Place has one,
 * otherwise the legacy id URL (which redirects once a slug exists).
 * `ref` / `qrId` are tracking-only and never part of the canonical URL.
 */
export function placePublicUrl(
  place: { placeId: string; slug?: string | null },
  options: { ref?: PlaceLinkRef; qrId?: string } = {},
): string {
  const base =
    place.slug && isValidPlaceSlug(place.slug)
      ? placeCanonicalUrlForSlug(place.slug)
      : placeShareUrl(place.placeId)
  const params = new URLSearchParams()
  if (options.ref) {
    params.set('ref', options.ref)
  }
  if (options.qrId) {
    params.set('qr', options.qrId)
  }
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

/**
 * URL we hand out for a Place (Share / Copy Link / QR). See
 * PLACE_LINKS_USE_LEGACY_ID_PATH for why it may use the legacy id path.
 * For display, use placePublicUrl (the clean canonical URL).
 */
export function placeOutboundUrl(
  place: { placeId: string; slug?: string | null },
  options: { ref?: PlaceLinkRef; qrId?: string; useLegacyIdPath?: boolean } = {},
): string {
  const useLegacy = options.useLegacyIdPath ?? PLACE_LINKS_USE_LEGACY_ID_PATH
  return placePublicUrl(
    { placeId: place.placeId, slug: useLegacy ? null : place.slug },
    { ref: options.ref, qrId: options.qrId },
  )
}

/** Canonical web Place Chat path (`/places/{slug}/chat`). */
export function placeChatCanonicalPath(slug: string): string {
  return `${placeCanonicalPath(slug)}/chat`
}

/** Legacy web Place Chat path (`/place/{googlePlaceId}/chat`), 308s to canonical. */
export function placeChatLegacyPath(placeId: string): string {
  return `/place/${encodeURIComponent(placeId.trim())}/chat`
}

/**
 * Clean, readable Place Chat URL for display (e.g. under a "Live chat" QR):
 * `https://www.nessachat.com/places/{slug}/chat`, or the legacy
 * `/place/{googlePlaceId}/chat` until the Place has a slug. Never carries
 * tracking params; what the QR actually encodes is placeChatOutboundUrl.
 */
export function placeChatPublicUrl(place: { placeId: string; slug?: string | null }): string {
  const path =
    place.slug && isValidPlaceSlug(place.slug)
      ? placeChatCanonicalPath(place.slug)
      : placeChatLegacyPath(place.placeId)
  return `${PLACE_PUBLIC_ORIGIN}${path}`
}

/**
 * Web Place Chat URL we hand out (QR / pre-arrival / business tools).
 * Follows the same legacy-path switch as Place links so existing app
 * installs open the Place rather than their home screen.
 */
export function placeChatOutboundUrl(
  place: { placeId: string; slug?: string | null },
  options: { ref?: PlaceLinkRef; qrId?: string; useLegacyIdPath?: boolean } = {},
): string {
  const useLegacy = options.useLegacyIdPath ?? PLACE_LINKS_USE_LEGACY_ID_PATH
  const path =
    !useLegacy && place.slug && isValidPlaceSlug(place.slug)
      ? placeChatCanonicalPath(place.slug)
      : placeChatLegacyPath(place.placeId)
  const params = new URLSearchParams()
  if (options.ref) {
    params.set('ref', options.ref)
  }
  if (options.qrId) {
    params.set('qr', options.qrId)
  }
  const query = params.toString()
  return `${PLACE_PUBLIC_ORIGIN}${path}${query ? `?${query}` : ''}`
}

/** URL encoded into Place QR codes (always tagged `ref=qr`). */
export function placeQrUrl(
  place: { placeId: string; slug?: string | null },
  options: { qrId?: string; useLegacyIdPath?: boolean } = {},
): string {
  return placeOutboundUrl(place, { ...options, ref: 'qr' })
}

/**
 * Rebuild a query string from Next's `searchParams` so redirects keep
 * tracking params (`?ref=qr` on an old QR survives the hop to the slug URL).
 */
export function searchParamsToQueryString(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): string {
  if (!searchParams) {
    return ''
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        params.append(key, v)
      }
    } else if (typeof value === 'string') {
      params.append(key, value)
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}
