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
  PublicPlaceComment,
  PublicPlaceLanding,
  PublicPlaceRecommender,
  PublicPlaceWifi,
} from '@/lib/place-landing'

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

/** The Place's public Wi-Fi, if any (getPublicPlaceLanding; only the Wi-Fi is used). */
export async function fetchPublicPlaceWifi(placeId: string): Promise<PublicPlaceWifi | null> {
  const trimmed = placeId.trim()
  if (!isPublicPlaceIdValid(trimmed)) return null
  const landing = await callPublicFunction<Pick<PublicPlaceLanding, 'wifi'>>('getPublicPlaceLanding', { placeId: trimmed })
  const wifi = landing?.wifi
  if (!wifi || typeof wifi.networkName !== 'string' || typeof wifi.password !== 'string') return null
  return {
    networkName: wifi.networkName,
    password: wifi.password,
    ...(typeof wifi.note === 'string' && wifi.note.trim() ? { note: wifi.note.trim() } : {}),
  }
}
