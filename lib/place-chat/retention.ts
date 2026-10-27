/**
 * Per-room Place Chat message retention (web side).
 *
 * The backend stamps each message's `expiresAt` from the room's
 * `messageRetentionHours` (24h when unset); the web only needs it for copy
 * ("messages last 7 days") and for showing a day next to older messages.
 * Mirrors functions/src/placeChat/retention.ts.
 */

export const PLACE_CHAT_DEFAULT_RETENTION_HOURS = 24

/** 24 hours (default), 3 days, 7 days, 30 days. */
export const PLACE_CHAT_RETENTION_HOURS_OPTIONS = [24, 72, 168, 720] as const
export type PlaceChatRetentionHours = (typeof PLACE_CHAT_RETENTION_HOURS_OPTIONS)[number]

export function isPlaceChatRetentionHours(value: unknown): value is PlaceChatRetentionHours {
  return (
    typeof value === 'number' &&
    (PLACE_CHAT_RETENTION_HOURS_OPTIONS as readonly number[]).includes(value)
  )
}

/** The room's effective retention; anything missing or unexpected → 24h. */
export function resolvePlaceChatRetentionHours(raw: unknown): PlaceChatRetentionHours {
  return isPlaceChatRetentionHours(raw) ? raw : PLACE_CHAT_DEFAULT_RETENTION_HOURS
}

/** "24 hours", "3 days", "7 days", "30 days". */
export function placeChatRetentionLabel(hours: number): string {
  const h = resolvePlaceChatRetentionHours(hours)
  if (h % 24 === 0 && h >= 48) return `${h / 24} days`
  return `${h} hours`
}

/** Empty-room hint, e.g. "Messages disappear after 7 days. The room stays open." */
export function placeChatRetentionHint(hours: number): string {
  return `Messages disappear after ${placeChatRetentionLabel(hours)}. The room stays open.`
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Message time: "14:05" today, "Tue 14:05" within the last week, otherwise
 * "Oct 3, 14:05" — so a message from days ago in a 7-day room is not read as
 * today's.
 */
export function formatPlaceChatMessageTime(
  ms: number,
  nowMs: number = Date.now(),
  locales?: string | string[],
): string {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const d = new Date(ms)
  const now = new Date(nowMs)
  const time = d.toLocaleTimeString(locales ?? [], { hour: '2-digit', minute: '2-digit' })
  if (sameLocalDay(d, now)) return time
  const ageMs = nowMs - ms
  if (ageMs >= 0 && ageMs < 6 * 24 * 60 * 60 * 1000) {
    return `${d.toLocaleDateString(locales ?? [], { weekday: 'short' })} ${time}`
  }
  return `${d.toLocaleDateString(locales ?? [], { month: 'short', day: 'numeric' })}, ${time}`
}
