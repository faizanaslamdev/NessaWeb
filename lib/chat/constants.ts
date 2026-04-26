/** Firestore collection for web chat sessions (isolated from legacy `chats`). */
export const CHAT_SESSIONS_COLLECTION = 'instant_chat_sessions'

/** Absolute session ceiling from first activity baseline (client + rules). */
export const SESSION_ABSOLUTE_MS = 60 * 60 * 1000

/** Inactivity window after last message (`lastActivityAt`). */
export const SESSION_INACTIVITY_MS = 60 * 60 * 1000

/** RTDB path segment (same convention as NessaChat `RTDB_PATHS.PRESENCE`). */
export function rtdbPresencePath(uid: string) {
  return `realtime/presence/${uid}`
}
