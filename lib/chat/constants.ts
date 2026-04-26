/** Firestore collection for web chat sessions (isolated from legacy `chats`). */
export const CHAT_SESSIONS_COLLECTION = 'instant_chat_sessions'

/** Absolute session ceiling from create (`expiresAt`; client + rules). */
export const SESSION_ABSOLUTE_MS = 60 * 60 * 1000

/** Header countdown appears only when remaining is at most this long (`10m` … `1m` / seconds). */
export const SESSION_HEADER_COUNTDOWN_MAX_MS = 10 * 60 * 1000

/**
 * If we never get a Firestore session snapshot with `fromCache: false` and `hasPendingWrites: false`
 * (e.g. long-lived offline cache), still allow client-side expiry UI after this delay so
 * the room does not stay “live” forever with stale cache. See `useInstantSession`.
 */
export const INSTANT_SESSION_SERVER_READ_FALLBACK_MS = 4000

/** RTDB path segment (same convention as NessaChat `RTDB_PATHS.PRESENCE`). */
export function rtdbPresencePath(uid: string) {
  return `realtime/presence/${uid}`
}
