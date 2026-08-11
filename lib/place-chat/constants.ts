/** Place Chat — permanent room per Google Place ID (web). */

export const PLACE_CHATS_COLLECTION = 'place_chats'
export const PLACE_CHAT_MESSAGES_SUBCOLLECTION = 'messages'
export const PLACE_CHAT_MESSAGE_TTL_MS = 24 * 60 * 60 * 1000
export const PLACE_CHAT_MESSAGE_TEXT_MAX = 2000
export const PLACE_CHAT_MESSAGE_PAGE_SIZE = 50
export const PLACE_CHAT_SCHEMA_VERSION = 1
export const PLACE_CHAT_TITLE_NAME_MAX = 40
export const PLACE_CHAT_GUEST_NAME_KEY = 'nessa_place_chat_guest_name'

export function isGooglePlaceId(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  const trimmed = value.trim()
  return trimmed.length > 0 && /^ChIJ[\w-]+$/.test(trimmed)
}

export function buildPlaceChatTitle(placeName: string | null | undefined): string {
  const raw = (placeName ?? '').trim().replace(/\s+/g, ' ')
  const base = raw || 'Place'
  const truncated =
    base.length > PLACE_CHAT_TITLE_NAME_MAX
      ? `${base.slice(0, PLACE_CHAT_TITLE_NAME_MAX - 1).trimEnd()}…`
      : base
  return `${truncated} Chat`
}

export function isPlaceChatMessageExpired(
  expiresAtMs: number | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (expiresAtMs == null || !Number.isFinite(expiresAtMs)) {
    return true
  }
  return expiresAtMs <= nowMs
}
