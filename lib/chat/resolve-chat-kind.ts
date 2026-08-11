/**
 * Resolve Instant vs Place chat kind for `/chat/[roomId]`.
 * Room ID shape is primary; query params are hints only and cannot force Instant → Place.
 */

import { isGooglePlaceId } from '@/lib/place-chat/constants'

export type WebChatKind = 'instant' | 'place'

export type ResolveWebChatKindResult =
  | { kind: 'instant'; roomId: string }
  | { kind: 'place'; roomId: string; placeId: string }
  | { kind: 'error'; message: string }

/**
 * @param roomId Path param
 * @param search Optional URLSearchParams (`type`, `placeId`)
 */
export function resolveWebChatKind(
  roomId: string,
  search?: URLSearchParams | null,
): ResolveWebChatKindResult {
  const id = (roomId ?? '').trim()
  if (!id) {
    return { kind: 'error', message: 'Missing room id.' }
  }

  const typeHint = search?.get('type')?.trim().toLowerCase() ?? null
  const placeIdHint = search?.get('placeId')?.trim() ?? null

  // Malformed: claim place without a Google Place ID in the path.
  if (typeHint === 'place' && !isGooglePlaceId(id)) {
    return {
      kind: 'error',
      message: 'Invalid Place Chat link. Open a place page and try Join Live Chat again.',
    }
  }

  // Malformed: placeId query disagrees with path.
  if (placeIdHint && placeIdHint !== id) {
    return {
      kind: 'error',
      message: 'Place Chat link is inconsistent. Open the place page and try again.',
    }
  }

  // Canonical: Google Place IDs are Place Chat rooms (never Instant sessions).
  if (isGooglePlaceId(id)) {
    return { kind: 'place', roomId: id, placeId: id }
  }

  // Claiming Instant for a Place ID is ignored above; plain Instant path:
  if (typeHint === 'place') {
    return {
      kind: 'error',
      message: 'Invalid Place Chat link.',
    }
  }

  return { kind: 'instant', roomId: id }
}
