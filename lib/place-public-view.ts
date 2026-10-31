/**
 * What the public Place page may show and ship to the browser.
 *
 * Google Maps Platform content that must not be cached or redisplayed by us
 * is removed here, once, for the server HTML, the embedded data and the
 * Open Graph / JSON-LD image:
 * - Google's photo (a key-bearing Places media URL, billed per load) and its
 *   author / Google Maps attribution;
 * - Google's formatted street address.
 * The hero uses our own photo, else the verified business's cover or logo,
 * else a neutral placeholder. Ratings and reviews are never requested from
 * Google (removed from the Place Details field mask), so none exist here.
 */

import type { PublicBusinessProfile } from '@/lib/business-profile'
import type { PublicPlaceLanding } from '@/lib/place-landing'
import { isNessaPhotoUrl } from '@/lib/place-photo'

/** Landing without Google-sourced media / address, plus whether it has public Wi-Fi. */
export type PublicPlaceView = Omit<PublicPlaceLanding, 'googlePhotoAttribution' | 'formattedAddress' | 'wifi'> & {
  /** Public Wi-Fi exists; the browser loads it (never in server HTML). */
  hasWifi?: boolean
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
  const copy: PublicPlaceLanding & { hasWifi?: boolean } = { ...landing }
  if (!hasNessaCover(landing)) {
    delete copy.coverImageUrl
    delete copy.coverSource
    delete copy.coverFeedUrl
    delete copy.coverCredit
  } else if (copy.coverFeedUrl && !copy.coverFeedUrl.startsWith('https://') && !isNessaPhotoUrl(copy.coverFeedUrl)) {
    delete copy.coverFeedUrl
  }
  delete copy.googlePhotoAttribution
  delete copy.formattedAddress
  const hasWifi = Boolean(copy.wifi)
  delete copy.wifi
  if (hasWifi) copy.hasWifi = true
  return copy
}

export type PlaceHeroImage =
  | { kind: 'photo'; url: string; credit?: string }
  | { kind: 'business-cover'; url: string }
  | { kind: 'logo'; url: string; name: string }
  | { kind: 'none' }

/** Hero: our cover → business cover → business logo → placeholder. Never Google's photo. */
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
