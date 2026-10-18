/**
 * Classify where a public Place page visit came from, without creating
 * duplicate pages: every variant shares one canonical URL; the source is
 * read from tracking params / the referrer, counted, then stripped from the
 * address bar.
 *
 * Links we print/share ourselves carry `?ref=`:
 *   qr → printed QR codes (optional `&qr=<id>` per QR, e.g. table-4)
 *   ig → Instagram bio     site → the business's website     app → Nessa app share
 * Standard `utm_source` / `utm_medium` are honored too. Without either, the
 * referrer decides (search engines, Instagram, nessachat.com itself, other
 * sites), falling back to `direct`.
 *
 * Source names mirror functions/src/places/shared/placeLinkStats.ts.
 */

export type PlaceLinkSource =
  | 'qr'
  | 'instagram'
  | 'website'
  | 'search'
  | 'nessa_app'
  | 'nessa_web'
  | 'referral'
  | 'direct'

const REF_ALIASES: Record<string, PlaceLinkSource> = {
  qr: 'qr',
  ig: 'instagram',
  insta: 'instagram',
  instagram: 'instagram',
  site: 'website',
  web: 'website',
  website: 'website',
  app: 'nessa_app',
  nessa: 'nessa_app',
  nessa_app: 'nessa_app',
  google: 'search',
  seo: 'search',
  search: 'search',
}

const SEARCH_HOST =
  /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|yahoo\.[a-z.]+|yandex\.[a-z.]+|ecosia\.org|baidu\.com|search\.brave\.com)$/i
const INSTAGRAM_HOST = /(^|\.)instagram\.com$/i
const NESSA_HOST = /(^|\.)nessachat\.com$/i

/** Params that exist only for attribution — removed after the visit is counted. */
export const PLACE_TRACKING_PARAMS = [
  'ref',
  'qr',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'igshid',
  'fbclid',
] as const

export function sanitizeQrId(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }
  const trimmed = value.trim().toLowerCase()
  return /^[a-z0-9][a-z0-9_-]{0,31}$/.test(trimmed) ? trimmed : null
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

export function classifyPlaceLinkSource(input: {
  searchParams: URLSearchParams
  referrer?: string | null
}): { source: PlaceLinkSource; qrId: string | null } {
  const params = input.searchParams
  const ref = params.get('ref')?.trim().toLowerCase() ?? ''
  const utmSource = params.get('utm_source')?.trim().toLowerCase() ?? ''
  const utmMedium = params.get('utm_medium')?.trim().toLowerCase() ?? ''

  let source: PlaceLinkSource | null =
    REF_ALIASES[ref] ?? REF_ALIASES[utmSource] ?? null
  if (!source && utmMedium === 'qr') {
    source = 'qr'
  }

  if (!source) {
    const host = input.referrer ? hostOf(input.referrer) : null
    if (!host) {
      source = 'direct'
    } else if (NESSA_HOST.test(host)) {
      source = 'nessa_web'
    } else if (SEARCH_HOST.test(host)) {
      source = 'search'
    } else if (INSTAGRAM_HOST.test(host)) {
      source = 'instagram'
    } else {
      source = 'referral'
    }
  }

  const qrId = source === 'qr' ? sanitizeQrId(params.get('qr')) : null
  return { source, qrId }
}

/**
 * Same URL minus attribution params (path + remaining query + hash), or null
 * when there was nothing to strip.
 */
export function stripPlaceTrackingParams(href: string): string | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  let changed = false
  for (const key of PLACE_TRACKING_PARAMS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (!changed) {
    return null
  }
  const query = url.searchParams.toString()
  return `${url.pathname}${query ? `?${query}` : ''}${url.hash}`
}
