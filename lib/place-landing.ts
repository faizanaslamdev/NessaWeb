/**
 * Public Place landing types + Firebase callable clients (no login required).
 */

import { getFunctions, httpsCallable } from 'firebase/functions'

import { sanitizePublicBusiness, type PublicBusinessProfile } from '@/lib/business-profile'
import { getFirebaseClient } from '@/lib/firebase'
import {
  PublicPlaceLandingError,
  isPublicPlaceIdValid,
  mapPublicCallableError,
  normalizeComments,
} from '@/lib/place-public-api'

// Firebase-free public callables live in place-public-api.ts (the public
// Place page loads them without the Firebase SDK); re-exported here.
export {
  PublicPlaceLandingError,
  fetchPublicPlaceRecommenders,
  fetchPublicStoryComments,
  isPublicPlaceIdValid,
  recordPlaceLinkVisit,
  type PublicPlaceLandingErrorCode,
} from '@/lib/place-public-api'

export type PublicPlaceRecommender = {
  displayName: string
  avatarUrl?: string
  /** Optional recommendation note from place_recommendations.note */
  note?: string
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
  /**
   * `nessa`: our own photo (fine in HTML / OG). `google`: Google's photo —
   * key-bearing and billed per load; show it with `googlePhotoAttribution`.
   */
  coverSource?: 'nessa' | 'google'
  /** Smaller variant of a NessaChat cover. */
  coverFeedUrl?: string
  /** Credit for a NessaChat cover ("Photo: Ana"). */
  coverCredit?: string
  /** Required credits for a Google cover. */
  googlePhotoAttribution?: GooglePhotoAttribution
  /** NessaChat gallery (business / admin uploads). */
  photos?: PublicPlacePhoto[]
  recommenderCount: number
  storyCount: number
  visitedCount: number
  recommenders?: PublicPlaceRecommender[]
  stories?: PublicPlaceStoryPreview[]
  /** Public Wi-Fi when configured with isPublic on the Place doc. */
  wifi?: PublicPlaceWifi
  /** Canonical public slug (`/places/{slug}`) when the Place has one. */
  slug?: string
  /** Verified business that manages this Place (official layer), if any. */
  business?: PublicBusinessProfile
  /** Place Chat message retention in hours (admin-managed; 24 when unset). */
  chatRetentionHours?: number
}

export type GooglePhotoAttribution = {
  authors: { displayName: string; uri?: string }[]
  googleMapsUri?: string
}

export type PublicPlacePhoto = {
  id: string
  url: string
  feedUrl?: string
  width?: number
  height?: number
  creditName?: string
  caption?: string
}

export type {
  BusinessSocials,
  OpeningHours,
  OpeningInterval,
  PriceRange,
  PublicBusinessProfile,
  WeekDay,
} from '@/lib/business-profile'

export type PublicPlaceWifi = {
  networkName: string
  password: string
  note?: string
}

export const PLACE_WIFI_NETWORK_NAME_MAX = 64
export const PLACE_WIFI_PASSWORD_MAX = 128
export const PLACE_WIFI_NOTE_MAX = 200

export type SetPlaceWifiPublicErrorCode =
  | 'invalid-argument'
  | 'unauthenticated'
  | 'not-found'
  | 'permission-denied'
  | 'resource-exhausted'
  | 'unavailable'
  | 'internal'
  | 'unknown'

export class SetPlaceWifiPublicError extends Error {
  readonly code: SetPlaceWifiPublicErrorCode

  constructor(code: SetPlaceWifiPublicErrorCode, message: string) {
    super(message)
    this.name = 'SetPlaceWifiPublicError'
    this.code = code
  }
}

function mapSetWifiError(err: unknown): SetPlaceWifiPublicError {
  const code = (err as { code?: string })?.code ?? ''
  const message =
    typeof (err as { message?: string })?.message === 'string'
      ? (err as { message: string }).message.replace(/^[^:]+:\s*/, '')
      : ''

  if (code.includes('unauthenticated')) {
    return new SetPlaceWifiPublicError(
      'unauthenticated',
      'Sign in with a verified email to manage this place.',
    )
  }
  if (code.includes('permission-denied')) {
    return new SetPlaceWifiPublicError(
      'permission-denied',
      'Only Nessa admins and this place’s business team can change its Wi-Fi.',
    )
  }
  if (code.includes('invalid-argument')) {
    return new SetPlaceWifiPublicError(
      'invalid-argument',
      message || 'Invalid Wi-Fi details.',
    )
  }
  if (code.includes('not-found')) {
    return new SetPlaceWifiPublicError('not-found', 'Place not found.')
  }
  if (code.includes('resource-exhausted')) {
    return new SetPlaceWifiPublicError(
      'resource-exhausted',
      'Too many attempts. Please try again later.',
    )
  }
  if (code.includes('unavailable') || code.includes('failed-precondition')) {
    return new SetPlaceWifiPublicError(
      'unavailable',
      'Wi-Fi update is temporarily unavailable.',
    )
  }
  return new SetPlaceWifiPublicError(
    'internal',
    'Could not save Wi-Fi. Please try again.',
  )
}

function getCallableFunctions() {
  const { app } = getFirebaseClient()
  return getFunctions(app)
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
    const { business: rawBusiness, ...data } = result.data
    // Business fields end up in hrefs / mailto links: validate them here.
    const business = sanitizePublicBusiness(rawBusiness)
    return {
      ...data,
      ...(business ? { business } : {}),
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
    throw mapPublicCallableError(e)
  }
}

/**
 * Wi-Fi write / remove. The server allows Nessa admins (any Place) and the
 * Place's business — owners, and managers on the Places assigned to them —
 * signed in with a verified email (the Firebase ID token travels with the
 * callable). Every change is audited. The client never writes Firestore
 * places directly.
 */
export async function setPlaceWifiPublic(input: {
  placeId: string
  networkName: string
  password: string
  note?: string
  isPublic?: boolean
}): Promise<PublicPlaceWifi | null> {
  if (!isPublicPlaceIdValid(input.placeId)) {
    throw new SetPlaceWifiPublicError('invalid-argument', 'Invalid place.')
  }
  try {
    const callable = httpsCallable<
      {
        placeId: string
        networkName: string
        password: string
        note?: string
        isPublic?: boolean
      },
      { wifi: PublicPlaceWifi | null }
    >(getCallableFunctions(), 'setPlaceWifiPublic')
    const result = await callable({
      placeId: input.placeId.trim(),
      networkName: input.networkName,
      password: input.password,
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(typeof input.isPublic === 'boolean'
        ? { isPublic: input.isPublic }
        : {}),
    })
    const wifi = result.data?.wifi
    if (!wifi || typeof wifi !== 'object') {
      return null
    }
    if (
      typeof wifi.networkName !== 'string' ||
      typeof wifi.password !== 'string'
    ) {
      return null
    }
    return {
      networkName: wifi.networkName,
      password: wifi.password,
      ...(typeof wifi.note === 'string' && wifi.note.trim()
        ? { note: wifi.note.trim() }
        : {}),
    }
  } catch (e) {
    throw mapSetWifiError(e)
  }
}

/** Remove a Place's Wi-Fi (same permissions as `setPlaceWifiPublic`). */
export async function removePlaceWifi(input: { placeId: string }): Promise<void> {
  if (!isPublicPlaceIdValid(input.placeId)) {
    throw new SetPlaceWifiPublicError('invalid-argument', 'Invalid place.')
  }
  try {
    const callable = httpsCallable<
      { placeId: string; remove: true },
      { removed?: boolean }
    >(getCallableFunctions(), 'setPlaceWifiPublic')
    await callable({ placeId: input.placeId.trim(), remove: true })
  } catch (e) {
    throw mapSetWifiError(e)
  }
}

