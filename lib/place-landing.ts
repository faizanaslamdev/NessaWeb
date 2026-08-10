/**
 * Public Place landing types + Firebase callable client (no login required).
 */

import { getFunctions, httpsCallable } from 'firebase/functions'

import { getFirebaseClient } from '@/lib/firebase'

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
  const message =
    (err as { message?: string })?.message ||
    'Could not load this place. Please try again.'

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

export function isPublicPlaceIdValid(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  const trimmed = value.trim()
  return trimmed.length > 0 && GOOGLE_PLACE_ID_PATTERN.test(trimmed)
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
    const { app } = getFirebaseClient()
    const functions = getFunctions(app)
    const callable = httpsCallable<
      { placeId: string },
      PublicPlaceLanding
    >(functions, 'getPublicPlaceLanding')
    const result = await callable({ placeId: trimmed })
    return result.data
  } catch (e) {
    throw mapCallableError(e)
  }
}
