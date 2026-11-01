/**
 * What the public Place page puts into server HTML / the RSC payload.
 *
 * Google's photo is a key-bearing Places media URL, billed per load: it never
 * goes into server HTML, the embedded page data, og:image or JSON-LD. The
 * view only says that one exists (`googlePhoto`); the browser then loads it
 * after hydration and shows it with its author + Google Maps attribution
 * (components/place/place-hero.tsx), as agreed in the photo architecture:
 * our cover → business cover / logo → Google photo (Place page only, in the
 * browser, credited) → placeholder.
 *
 * Name, type, town and formatted address come from Google Maps and are shown
 * with a "from Google Maps" credit. Ratings and reviews are never requested
 * from Google (removed from the Place Details field mask).
 */

import type { PublicBusinessProfile } from '@/lib/business-profile'
import type { PublicPlaceLanding } from '@/lib/place-landing'
import { isNessaPhotoUrl } from '@/lib/place-photo'

/** Landing without Google's photo URL / attribution and Wi-Fi details, plus flags for the browser. */
export type PublicPlaceView = Omit<PublicPlaceLanding, 'googlePhotoAttribution' | 'wifi'> & {
  /** Public Wi-Fi exists; the browser loads it (never in server HTML). */
  hasWifi?: boolean
  /** Google has a photo of this Place; the browser loads it (never in server HTML). */
  googlePhoto?: boolean
}

function isSafeHttps(url: string | undefined | null): url is string {
  if (!url || !url.startsWith('https://') || url.length > 2048) return false
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && !u.searchParams.has('key')
  } catch {
    return false
  }
}

/** True when the landing's cover is NessaChat's own photo. */
export function hasNessaCover(landing: Pick<PublicPlaceLanding, 'coverImageUrl' | 'coverSource'>): boolean {
  const url = landing.coverImageUrl?.trim()
  if (!url) return false
  if (landing.coverSource === 'google') return false
  return landing.coverSource === 'nessa' ? url.startsWith('https://') || isNessaPhotoUrl(url) : isNessaPhotoUrl(url)
}

/**
 * Copy of a landing with Google-sourced content removed (and Wi-Fi reduced to
 * a flag). Safe for server HTML, the RSC payload and caches.
 */
export function toPublicPlaceView(landing: PublicPlaceLanding): PublicPlaceView {
  const copy: PublicPlaceLanding & { hasWifi?: boolean; googlePhoto?: boolean } = { ...landing }
  const googlePhoto = Boolean(landing.coverImageUrl?.trim()) && !hasNessaCover(landing)
  if (!hasNessaCover(landing)) {
    delete copy.coverImageUrl
    delete copy.coverSource
    delete copy.coverFeedUrl
    delete copy.coverCredit
  } else if (copy.coverFeedUrl && !copy.coverFeedUrl.startsWith('https://') && !isNessaPhotoUrl(copy.coverFeedUrl)) {
    delete copy.coverFeedUrl
  }
  delete copy.googlePhotoAttribution
  const hasWifi = Boolean(copy.wifi)
  delete copy.wifi
  if (hasWifi) copy.hasWifi = true
  if (googlePhoto) copy.googlePhoto = true
  return copy
}

export type PlaceHeroImage =
  | { kind: 'photo'; url: string; credit?: string }
  | { kind: 'business-cover'; url: string }
  | { kind: 'logo'; url: string; name: string }
  | { kind: 'none' }

/**
 * Server-side hero: our cover → business cover → business logo → none. A
 * Google photo (`googlePhoto`) is added by the browser in place of "none".
 */
export function placeHeroImage(
  place: Pick<PublicPlaceView, 'coverImageUrl' | 'coverSource' | 'coverCredit'> & {
    business?: Pick<PublicBusinessProfile, 'coverUrl' | 'logoUrl' | 'name'> | null
  },
): PlaceHeroImage {
  if (place.coverImageUrl && hasNessaCover(place)) {
    return { kind: 'photo', url: place.coverImageUrl.trim(), ...(place.coverCredit ? { credit: place.coverCredit } : {}) }
  }
  const business = place.business
  if (business && isSafeHttps(business.coverUrl)) return { kind: 'business-cover', url: business.coverUrl }
  if (business && isSafeHttps(business.logoUrl)) return { kind: 'logo', url: business.logoUrl, name: business.name }
  return { kind: 'none' }
}

/** Share / OG image: our cover, else the business cover; never Google's photo. */
export function placeShareImageUrl(
  share: { coverImageUrl?: string; coverSource?: 'nessa' | 'google'; business?: { coverUrl?: string } | null },
): string | null {
  if (share.coverImageUrl && share.coverSource !== 'google' && isSafeHttps(share.coverImageUrl)) return share.coverImageUrl
  if (isSafeHttps(share.business?.coverUrl)) return share.business!.coverUrl!
  return null
}

/**
 * A Google photo URL the browser may load (https; key-bearing is expected).
 * Only ever used client-side, never in server output.
 */
export function browserGooglePhotoUrl(landing: { coverImageUrl?: string; coverSource?: string } | null | undefined): string | null {
  const url = landing?.coverImageUrl?.trim()
  if (!url || !url.startsWith('https://') || url.length > 4096) return null
  if (hasNessaCover({ coverImageUrl: url, coverSource: landing?.coverSource === 'nessa' ? 'nessa' : landing?.coverSource === 'google' ? 'google' : undefined })) return null
  return url
}
