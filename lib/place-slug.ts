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

/** `ref` values we print on links/QRs we control (see place-link-source.ts). */
export type PlaceLinkRef = 'qr' | 'ig' | 'site' | 'app'

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
