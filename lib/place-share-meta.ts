/**
 * Server-only Place share metadata via the existing public callable (REST).
 * Cached so social crawlers get Place-specific <head> without client JS.
 */

import { unstable_cache } from 'next/cache'

import { siteConfig } from '@/lib/constants'
import { isPublicPlaceIdValid } from '@/lib/place-landing'

/** Consumer brand in Place share titles (matches product copy). */
export const PLACE_SHARE_BRAND = 'Nessa'

/** Canonical public site origin for Place QR / OG URLs. */
export const PLACE_SITE_ORIGIN = 'https://www.nessachat.com'

const METADATA_REVALIDATE_SECONDS = 600
const METADATA_FETCH_TIMEOUT_MS = 4000

export type PublicPlaceShareMeta = {
  googlePlaceId: string
  name: string
  city?: string
  country?: string
  placeType?: string
  coverImageUrl?: string
}

function callableUrl(): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
  if (!projectId) {
    return null
  }
  return `https://us-central1-${projectId}.cloudfunctions.net/getPublicPlaceLanding`
}

function sanitizePlainText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) {
    return undefined
  }
  if (cleaned.length <= max) {
    return cleaned
  }
  return `${cleaned.slice(0, max - 1).trimEnd()}…`
}

function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed.startsWith('https://') || trimmed.length > 2048) {
    return undefined
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:') {
      return undefined
    }
    return url.toString()
  } catch {
    return undefined
  }
}

function mapCallableResult(raw: unknown): PublicPlaceShareMeta | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const data = raw as Record<string, unknown>
  const googlePlaceId =
    typeof data.googlePlaceId === 'string' ? data.googlePlaceId.trim() : ''
  const name = sanitizePlainText(data.name, 120)
  if (!isPublicPlaceIdValid(googlePlaceId) || !name) {
    return null
  }
  const meta: PublicPlaceShareMeta = { googlePlaceId, name }
  const city = sanitizePlainText(data.city, 80)
  if (city) {
    meta.city = city
  }
  const country = sanitizePlainText(data.country, 80)
  if (country) {
    meta.country = country
  }
  const placeType = sanitizePlainText(data.placeType, 60)
  if (placeType) {
    meta.placeType = placeType
  }
  const coverImageUrl = safeHttpsUrl(data.coverImageUrl)
  if (coverImageUrl) {
    meta.coverImageUrl = coverImageUrl
  }
  return meta
}

async function fetchPublicPlaceShareMetaUncached(
  placeId: string,
): Promise<PublicPlaceShareMeta | null> {
  const url = callableUrl()
  if (!url) {
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), METADATA_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { placeId } }),
      signal: controller.signal,
      // Explicitly uncached at fetch layer; unstable_cache owns TTL.
      cache: 'no-store',
    })
    if (!response.ok) {
      return null
    }
    const payload = (await response.json()) as { result?: unknown; error?: unknown }
    if (payload.error) {
      return null
    }
    return mapCallableResult(payload.result)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Cached Place share fields for generateMetadata.
 * Fail-closed: returns null on invalid id / errors / timeout.
 */
export function getCachedPublicPlaceShareMeta(
  placeId: string,
): Promise<PublicPlaceShareMeta | null> {
  const trimmed = placeId.trim()
  if (!isPublicPlaceIdValid(trimmed)) {
    return Promise.resolve(null)
  }

  return unstable_cache(
    async () => fetchPublicPlaceShareMetaUncached(trimmed),
    ['public-place-share-meta', trimmed],
    { revalidate: METADATA_REVALIDATE_SECONDS },
  )()
}

export function placeCanonicalUrl(placeId: string): string {
  return `${PLACE_SITE_ORIGIN}/place/${encodeURIComponent(placeId.trim())}`
}

export function placeFallbackOgImageUrl(): string {
  return `${PLACE_SITE_ORIGIN}/logo.png`
}

export function buildPlaceShareDescription(meta: PublicPlaceShareMeta): string {
  const name = meta.name
  return `Discover ${name} on ${PLACE_SHARE_BRAND} — see recommendations, stories and what's happening there.`
}

export function buildGenericPlaceMetadata(input: {
  placeId: string
  validId: boolean
}) {
  const path = `/place/${encodeURIComponent(input.placeId || 'unknown')}`
  const canonical = input.validId
    ? placeCanonicalUrl(input.placeId)
    : `${PLACE_SITE_ORIGIN}${path}`

  if (!input.validId) {
    return {
      title: `Invalid place | ${siteConfig.name}`,
      description: 'This place link is not valid.',
      canonical,
      ogTitle: siteConfig.name,
      ogDescription: siteConfig.description,
      ogImage: placeFallbackOgImageUrl(),
    }
  }

  return {
    title: `Place on ${PLACE_SHARE_BRAND}`,
    description: `See this place on ${PLACE_SHARE_BRAND} and recommend it to travelers.`,
    canonical,
    ogTitle: `Recommend this place on ${PLACE_SHARE_BRAND}`,
    ogDescription: `Open the place page, then recommend it in the ${PLACE_SHARE_BRAND} app.`,
    ogImage: placeFallbackOgImageUrl(),
  }
}
