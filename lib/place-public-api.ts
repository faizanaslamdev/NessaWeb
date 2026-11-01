/**
 * Public (unauthenticated) Place callables without the Firebase SDK.
 *
 * The public Place page only needs a few anonymous calls (visit tracking,
 * all recommendations, story comments, public Wi-Fi). Speaking the callable
 * protocol with fetch (POST {data} → {result} | {error}) keeps the Firebase
 * SDK (~230 KB gzip) out of that page. Same endpoints and payloads as
 * `httpsCallable`; no auth token is sent (none of these use one).
 */

import type {
  GooglePhotoAttribution,
  PublicPlaceComment,
  PublicPlaceLanding,
  PublicPlaceRecommender,
  PublicPlaceWifi,
} from '@/lib/place-landing'
import { browserGooglePhotoUrl } from '@/lib/place-public-view'

const CALL_TIMEOUT_MS = 15000

function functionUrl(name: string): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const emulator = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST
  return emulator
    ? `http://${emulator}/${projectId}/us-central1/${name}`
    : `https://us-central1-${projectId}.cloudfunctions.net/${name}`
}

/** Error with an SDK-style code (`functions/not-found`, …). */
export class PublicCallableError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'PublicCallableError'
    this.code = code
  }
}

/** Call an onCall function anonymously. Throws PublicCallableError. */
export async function callPublicFunction<T>(name: string, data: Record<string, unknown>): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS)
  try {
    let res: Response
    try {
      res = await fetch(functionUrl(name), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
        signal: controller.signal,
      })
    } catch (e) {
      throw new PublicCallableError('functions/unavailable', e instanceof Error ? e.message : 'network error')
    }
    const body = (await res.json().catch(() => null)) as { result?: T; error?: { status?: string; message?: string } } | null
    if (!res.ok || !body || body.error || !('result' in body)) {
      const status = (body?.error?.status ?? (res.status >= 500 ? 'INTERNAL' : 'UNKNOWN')).toLowerCase().replace(/_/g, '-')
      throw new PublicCallableError(`functions/${status}`, body?.error?.message ?? `HTTP ${res.status}`)
    }
    return body.result as T
  } finally {
    clearTimeout(timer)
  }
}

export type PublicPlaceLandingErrorCode =
  | 'invalid-argument'
  | 'not-found'
  | 'unavailable'
  | 'resource-exhausted'
  | 'internal'
  | 'unknown'

export class PublicPlaceLandingError extends Error {
  readonly code: PublicPlaceLandingErrorCode

  constructor(code: PublicPlaceLandingErrorCode, message: string) {
    super(message)
    this.name = 'PublicPlaceLandingError'
    this.code = code
  }
}

export function mapPublicCallableError(err: unknown): PublicPlaceLandingError {
  const code = (err as { code?: string })?.code ?? ''

  if (code.includes('invalid-argument')) {
    return new PublicPlaceLandingError('invalid-argument', 'Invalid place link.')
  }
  if (code.includes('not-found')) {
    return new PublicPlaceLandingError(
      'not-found',
      'We could not find this place.',
    )
  }
  if (code.includes('resource-exhausted')) {
    return new PublicPlaceLandingError(
      'resource-exhausted',
      'Too many requests. Please try again shortly.',
    )
  }
  if (code.includes('unavailable') || code.includes('failed-precondition')) {
    return new PublicPlaceLandingError(
      'unavailable',
      'Place preview is temporarily unavailable.',
    )
  }
  if (code.includes('internal') || code.includes('unknown')) {
    return new PublicPlaceLandingError(
      'internal',
      'Could not load this place. Please try again.',
    )
  }
  return new PublicPlaceLandingError(
    'unknown',
    'Could not load this place. Please try again.',
  )
}

/** Typical Google Place ID prefix (Places API). */
const GOOGLE_PLACE_ID_PATTERN = /^ChIJ[\w-]+$/
const STORY_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

export function isPublicPlaceIdValid(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  const trimmed = value.trim()
  return trimmed.length > 0 && GOOGLE_PLACE_ID_PATTERN.test(trimmed)
}

export function normalizeComments(raw: unknown): PublicPlaceComment[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map(item => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const c = item as PublicPlaceComment
      if (typeof c.text !== 'string' || !c.text.trim()) {
        return null
      }
      if (typeof c.displayName !== 'string' || !c.displayName.trim()) {
        return null
      }
      return {
        displayName: c.displayName.trim(),
        text: c.text.trim(),
        ...(typeof c.avatarUrl === 'string' && c.avatarUrl.startsWith('https://')
          ? { avatarUrl: c.avatarUrl }
          : {}),
        ...(typeof c.createdAt === 'string' ? { createdAt: c.createdAt } : {}),
      }
    })
    .filter((c): c is PublicPlaceComment => Boolean(c))
}

export async function fetchPublicPlaceRecommenders(input: {
  placeId: string
  cursor?: string
  pageSize?: number
}): Promise<{ recommenders: PublicPlaceRecommender[]; nextCursor?: string }> {
  if (!isPublicPlaceIdValid(input.placeId)) {
    throw new PublicPlaceLandingError('invalid-argument', 'Invalid place link.')
  }
  try {
    const result = await callPublicFunction<{ recommenders: PublicPlaceRecommender[]; nextCursor?: string }>('getPublicPlaceRecommenders', {
      placeId: input.placeId.trim(),
      ...(input.cursor ? { cursor: input.cursor } : {}),
      ...(input.pageSize ? { pageSize: input.pageSize } : {}),
    })
    return {
      recommenders: Array.isArray(result.recommenders)
        ? result.recommenders
        : [],
      ...(typeof result.nextCursor === 'string'
        ? { nextCursor: result.nextCursor }
        : {}),
    }
  } catch (e) {
    throw mapPublicCallableError(e)
  }
}

export async function fetchPublicStoryComments(input: {
  storyId: string
  cursor?: string
  pageSize?: number
}): Promise<{
  comments: PublicPlaceComment[]
  commentCount: number
  nextCursor?: string
}> {
  const storyId = input.storyId.trim()
  if (!STORY_ID_PATTERN.test(storyId)) {
    throw new PublicPlaceLandingError('invalid-argument', 'Invalid story.')
  }
  try {
    const result = await callPublicFunction<{ comments: PublicPlaceComment[]; commentCount: number; nextCursor?: string }>('getPublicStoryComments', {
      storyId,
      ...(input.cursor ? { cursor: input.cursor } : {}),
      ...(input.pageSize ? { pageSize: input.pageSize } : {}),
    })
    return {
      comments: normalizeComments(result.comments),
      commentCount:
        typeof result.commentCount === 'number'
          ? Math.max(0, result.commentCount)
          : 0,
      ...(typeof result.nextCursor === 'string'
        ? { nextCursor: result.nextCursor }
        : {}),
    }
  } catch (e) {
    throw mapPublicCallableError(e)
  }
}

/**
 * Count one public Place page visit by source (fire-and-forget; aggregate
 * only). Errors are swallowed by callers — tracking must never affect the page.
 */
export async function recordPlaceLinkVisit(input: {
  placeId: string
  source: string
  qrId?: string | null
  /** 'visit' (default) or 'chat_join'. */
  event?: 'visit' | 'chat_join'
  /** 'new' | 'returning' — visits only. */
  visitor?: 'new' | 'returning' | null
}): Promise<void> {
  const placeId = input.placeId.trim()
  if (!isPublicPlaceIdValid(placeId)) {
    return
  }
  await callPublicFunction<{ ok: boolean; counted: boolean }>('recordPlaceLinkVisit', {
    placeId,
    source: input.source,
    ...(input.qrId ? { qrId: input.qrId } : {}),
    ...(input.event ? { event: input.event } : {}),
    ...(input.visitor ? { visitor: input.visitor } : {}),
  })
}

/** What the Place page loads in the browser (never in server HTML). */
export type PlaceBrowserExtras = {
  wifi: PublicPlaceWifi | null
  /** Google's photo (key-bearing URL) and its required credits, when the Place has no cover of ours. */
  googlePhoto: { url: string; attribution?: GooglePhotoAttribution } | null
}

function parseWifi(wifi: PublicPlaceWifi | undefined): PublicPlaceWifi | null {
  if (!wifi || typeof wifi.networkName !== 'string' || typeof wifi.password !== 'string') return null
  return {
    networkName: wifi.networkName,
    password: wifi.password,
    ...(typeof wifi.note === 'string' && wifi.note.trim() ? { note: wifi.note.trim() } : {}),
  }
}

function parseAttribution(raw: unknown): GooglePhotoAttribution | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as { authors?: unknown; googleMapsUri?: unknown }
  const https = (v: unknown) => (typeof v === 'string' && v.startsWith('https://') ? v : undefined)
  const authors = Array.isArray(r.authors)
    ? r.authors
        .map(a => (a && typeof a === 'object' ? (a as { displayName?: unknown; uri?: unknown }) : null))
        .filter((a): a is { displayName: string; uri?: unknown } => Boolean(a && typeof a.displayName === 'string' && a.displayName.trim()))
        .slice(0, 5)
        .map(a => ({ displayName: a.displayName.trim(), ...(https(a.uri) ? { uri: https(a.uri) } : {}) }))
    : []
  const googleMapsUri = https(r.googleMapsUri)
  return { authors, ...(googleMapsUri ? { googleMapsUri } : {}) }
}

const extrasRequests = new Map<string, Promise<PlaceBrowserExtras>>()

/**
 * One getPublicPlaceLanding call per Place per page view, shared by the hero
 * (Google photo) and both Wi-Fi placements. Callers only ask for Places that
 * have public Wi-Fi or a Google photo. Failures resolve to nothing (retried
 * on the next mount).
 */
export function loadPlaceBrowserExtras(placeId: string): Promise<PlaceBrowserExtras> {
  const trimmed = placeId.trim()
  const empty: PlaceBrowserExtras = { wifi: null, googlePhoto: null }
  if (!isPublicPlaceIdValid(trimmed)) return Promise.resolve(empty)
  let pending = extrasRequests.get(trimmed)
  if (!pending) {
    pending = callPublicFunction<Pick<PublicPlaceLanding, 'wifi' | 'coverImageUrl' | 'coverSource' | 'googlePhotoAttribution'>>(
      'getPublicPlaceLanding',
      { placeId: trimmed },
    )
      .then(landing => {
        const url = browserGooglePhotoUrl(landing)
        return {
          wifi: parseWifi(landing?.wifi),
          googlePhoto: url ? { url, attribution: parseAttribution(landing?.googlePhotoAttribution) } : null,
        }
      })
      .catch(() => {
        extrasRequests.delete(trimmed)
        return empty
      })
    extrasRequests.set(trimmed, pending)
  }
  return pending
}
