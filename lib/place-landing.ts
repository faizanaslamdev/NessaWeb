/**
 * Public Place landing types + Firebase callable clients (no login required).
 */

import { getFunctions, httpsCallable } from 'firebase/functions'

import { getFirebaseClient } from '@/lib/firebase'

export type PublicPlaceRecommender = {
  displayName: string
  avatarUrl?: string
  createdAt?: string
}

export type PublicPlaceStoryAuthor = {
  displayName: string
  avatarUrl?: string
}

export type PublicPlaceStoryMedia = {
  type: 'image'
  url: string
}

export type PublicPlaceComment = {
  displayName: string
  avatarUrl?: string
  text: string
  createdAt?: string
}

export type PublicPlaceStoryPreview = {
  id: string
  caption?: string
  type?: string
  media?: PublicPlaceStoryMedia[]
  thumbnailUrl?: string
  createdAt?: string
  author: PublicPlaceStoryAuthor
  commentCount?: number
  commentsPreview?: PublicPlaceComment[]
}

export type PublicPlaceLanding = {
  googlePlaceId: string
  name: string
  placeType: string
  city: string
  country?: string
  formattedAddress?: string
  coverImageUrl?: string
  recommenderCount: number
  storyCount: number
  visitedCount: number
  recommenders?: PublicPlaceRecommender[]
  stories?: PublicPlaceStoryPreview[]
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

function mapCallableError(err: unknown): PublicPlaceLandingError {
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

function getCallableFunctions() {
  const { app } = getFirebaseClient()
  return getFunctions(app)
}

function normalizeComments(raw: unknown): PublicPlaceComment[] {
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

/**
 * Call getPublicPlaceLanding (unauthenticated). Client-only after mount.
 */
export async function fetchPublicPlaceLanding(
  placeId: string,
): Promise<PublicPlaceLanding> {
  const trimmed = placeId.trim()
  if (!isPublicPlaceIdValid(trimmed)) {
    throw new PublicPlaceLandingError('invalid-argument', 'Invalid place link.')
  }

  try {
    const callable = httpsCallable<
      { placeId: string },
      PublicPlaceLanding
    >(getCallableFunctions(), 'getPublicPlaceLanding')
    const result = await callable({ placeId: trimmed })
    const data = result.data
    return {
      ...data,
      recommenders: Array.isArray(data.recommenders) ? data.recommenders : [],
      stories: Array.isArray(data.stories)
        ? data.stories.map(story => ({
            ...story,
            commentCount:
              typeof story.commentCount === 'number' &&
              Number.isFinite(story.commentCount)
                ? Math.max(0, story.commentCount)
                : 0,
            commentsPreview: normalizeComments(story.commentsPreview),
            media: Array.isArray(story.media)
              ? story.media.filter(
                  (m): m is { type: 'image'; url: string } =>
                    Boolean(
                      m &&
                        m.type === 'image' &&
                        typeof m.url === 'string' &&
                        m.url.startsWith('https://'),
                    ),
                )
              : story.thumbnailUrl
                ? [{ type: 'image' as const, url: story.thumbnailUrl }]
                : [],
          }))
        : [],
    }
  } catch (e) {
    throw mapCallableError(e)
  }
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
    const callable = httpsCallable<
      { placeId: string; cursor?: string; pageSize?: number },
      { recommenders: PublicPlaceRecommender[]; nextCursor?: string }
    >(getCallableFunctions(), 'getPublicPlaceRecommenders')
    const result = await callable({
      placeId: input.placeId.trim(),
      ...(input.cursor ? { cursor: input.cursor } : {}),
      ...(input.pageSize ? { pageSize: input.pageSize } : {}),
    })
    return {
      recommenders: Array.isArray(result.data.recommenders)
        ? result.data.recommenders
        : [],
      ...(typeof result.data.nextCursor === 'string'
        ? { nextCursor: result.data.nextCursor }
        : {}),
    }
  } catch (e) {
    throw mapCallableError(e)
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
    const callable = httpsCallable<
      { storyId: string; cursor?: string; pageSize?: number },
      {
        comments: PublicPlaceComment[]
        commentCount: number
        nextCursor?: string
      }
    >(getCallableFunctions(), 'getPublicStoryComments')
    const result = await callable({
      storyId,
      ...(input.cursor ? { cursor: input.cursor } : {}),
      ...(input.pageSize ? { pageSize: input.pageSize } : {}),
    })
    return {
      comments: normalizeComments(result.data.comments),
      commentCount:
        typeof result.data.commentCount === 'number'
          ? Math.max(0, result.data.commentCount)
          : 0,
      ...(typeof result.data.nextCursor === 'string'
        ? { nextCursor: result.data.nextCursor }
        : {}),
    }
  } catch (e) {
    throw mapCallableError(e)
  }
}
