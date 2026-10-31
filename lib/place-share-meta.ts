/**
 * Server-only Place share metadata via the existing public callable (REST).
 * Cached so social crawlers get Place-specific <head> without client JS.
 */

import { unstable_cache } from 'next/cache'

import { sanitizePublicBusiness, type PublicBusinessFields } from '@/lib/business-profile'
import { placeShareUrl, siteConfig } from '@/lib/constants'
import type { PublicPlaceLanding } from '@/lib/place-landing'
import { isPublicPlaceIdValid } from '@/lib/place-public-api'
import { hasNessaCover, toPublicPlaceView, type PublicPlaceView } from '@/lib/place-public-view'
import { isValidPlaceSlug } from '@/lib/place-slug'
import { PLACE_SHARE_BRAND, buildPlacePageTitle } from '@/lib/place-title'

export { PLACE_SHARE_BRAND, buildPlacePageTitle }

/** Canonical public site origin for Place QR / OG URLs. */
export const PLACE_SITE_ORIGIN = 'https://www.nessachat.com'

const METADATA_REVALIDATE_SECONDS = 600
const METADATA_FETCH_TIMEOUT_MS = 8000

export type PublicPlaceShareMeta = {
  googlePlaceId: string
  name: string
  city?: string
  country?: string
  placeType?: string
  /** NessaChat's own cover only (Google's photo is never kept here). */
  coverImageUrl?: string
  coverSource?: 'nessa'
  slug?: string
  recommenderCount?: number
  storyCount?: number
  /** Sanitized verified-business profile (everything SEO / JSON-LD needs). */
  business?: PublicBusinessFields
}

function callableUrl(): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
  if (!projectId) {
    return null
  }
  // Local verification only (server env; unset in production).
  const emulator = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST?.trim()
  if (emulator) {
    return `http://${emulator}/${projectId}/us-central1/getPublicPlaceLanding`
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
    // Never put key-bearing Google Places media URLs into public HTML/OG tags.
    if (url.searchParams.has('key') || /[?&]key=/i.test(trimmed)) {
      return undefined
    }
    return url.toString()
  } catch {
    return undefined
  }
}

/** Sanitized share / SEO subset of a landing payload (exported for tests). */
export function mapCallableResult(raw: unknown): PublicPlaceShareMeta | null {
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
  // Our own photo only: Google's (even a key-less URL) never reaches OG tags or JSON-LD.
  const coverImageUrl = safeHttpsUrl(data.coverImageUrl)
  const coverSource = data.coverSource === 'nessa' || data.coverSource === 'google' ? data.coverSource : undefined
  if (coverImageUrl && hasNessaCover({ coverImageUrl, coverSource })) {
    meta.coverImageUrl = coverImageUrl
    meta.coverSource = 'nessa'
  }
  if (typeof data.slug === 'string' && isValidPlaceSlug(data.slug)) {
    meta.slug = data.slug
  }
  if (typeof data.recommenderCount === 'number' && data.recommenderCount >= 0) {
    meta.recommenderCount = Math.floor(data.recommenderCount)
  }
  if (typeof data.storyCount === 'number' && data.storyCount >= 0) {
    meta.storyCount = Math.floor(data.storyCount)
  }
  const business = sanitizePublicBusiness(data.business)
  if (business) {
    const profile: PublicBusinessFields & { businessId?: string; verified?: true } = { ...business }
    delete profile.businessId
    delete profile.verified
    meta.business = profile
  }
  return meta
}

/** Optional shared key so SSR fetches get their own rate-limit bucket. */
function ssrKeyHeader(): Record<string, string> {
  const key = process.env.NESSA_WEB_SSR_KEY?.trim()
  return key ? { 'x-nessa-ssr-key': key } : {}
}

async function fetchPublicPlaceLandingUncached(
  placeId: string,
): Promise<PublicPlaceLanding | null> {
  const url = callableUrl()
  if (!url) {
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), METADATA_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...ssrKeyHeader() },
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
    // Validate the minimum shape; the client renders the rest as it already
    // does for its own callable responses.
    if (!mapCallableResult(payload.result)) {
      return null
    }
    return payload.result as PublicPlaceLanding
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Two attempts: the first call after a deploy can hit a cold function. */
async function fetchPublicPlaceLandingWithRetry(placeId: string): Promise<PublicPlaceLanding | null> {
  const first = await fetchPublicPlaceLandingUncached(placeId)
  if (first) {
    return first
  }
  await new Promise(resolve => setTimeout(resolve, 1000))
  return fetchPublicPlaceLandingUncached(placeId)
}

/**
 * Cached full public Place landing (one callable round trip per Place per
 * revalidate window, shared by generateMetadata and the server-rendered page
 * body). Fail-closed: null on invalid id / errors / timeout.
 */
export async function getCachedPublicPlaceLanding(
  placeId: string,
): Promise<PublicPlaceLanding | null> {
  const trimmed = placeId.trim()
  if (!isPublicPlaceIdValid(trimmed)) {
    return null
  }

  try {
    return await unstable_cache(
      async () => {
        const landing = await fetchPublicPlaceLandingWithRetry(trimmed)
        if (!landing) {
          // Do not cache misses — a timeout/error would pin "Place on Nessa"
          // in the helmet for the full revalidate window.
          throw new Error('place-landing-miss')
        }
        return landing
      },
      ['public-place-landing-v1', trimmed],
      { revalidate: METADATA_REVALIDATE_SECONDS },
    )()
  } catch {
    return null
  }
}

/**
 * Copy of a landing that is safe to embed in server-rendered HTML and the
 * page's RSC payload:
 * - no Google-sourced content (Google's photo and its attribution, Google's
 *   formatted address — see lib/place-public-view.ts);
 * - public Wi-Fi reduced to `hasWifi`, so crawlers and caches never see
 *   passwords. The browser fetches the Wi-Fi card itself;
 * - the verified business re-validated (malformed / non-https links dropped).
 */
export function toSsrSafeLanding(landing: PublicPlaceLanding): PublicPlaceView {
  const copy = { ...landing }
  if (copy.coverImageUrl && !safeHttpsUrl(copy.coverImageUrl) && !hasNessaCover(copy)) {
    delete copy.coverImageUrl
  }
  // Business links are rendered into hrefs: only validated fields.
  const business = sanitizePublicBusiness(landing.business)
  if (business) {
    copy.business = business
  } else {
    delete copy.business
  }
  return toPublicPlaceView(copy)
}

/**
 * Cached Place share fields for generateMetadata (sanitized subset of the
 * cached landing). Fail-closed: returns null on invalid id / errors / timeout.
 */
export async function getCachedPublicPlaceShareMeta(
  placeId: string,
): Promise<PublicPlaceShareMeta | null> {
  const landing = await getCachedPublicPlaceLanding(placeId)
  return landing ? mapCallableResult(landing) : null
}

export function placeCanonicalUrl(placeId: string): string {
  return placeShareUrl(placeId)
}

/**
 * Compact brand mark for WhatsApp / OG fallback.
 * Keep under 300px so WhatsApp uses a small thumbnail instead of a full-bleed
 * square logo (logo.png is 540×540 and renders huge in chat).
 */
export function placeFallbackOgImageUrl(): string {
  return `${PLACE_SITE_ORIGIN}/og-place-icon.png`
}

export const PLACE_FALLBACK_OG_IMAGE = {
  url: placeFallbackOgImageUrl(),
  width: 200,
  height: 200,
  type: 'image/png' as const,
  alt: PLACE_SHARE_BRAND,
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
    title: buildPlacePageTitle(),
    description: `See this place on ${PLACE_SHARE_BRAND} and recommend it to travelers.`,
    canonical,
    ogTitle: `Recommend this place on ${PLACE_SHARE_BRAND}`,
    ogDescription: `Open the place page, then recommend it in the ${PLACE_SHARE_BRAND} app.`,
    ogImage: placeFallbackOgImageUrl(),
  }
}
