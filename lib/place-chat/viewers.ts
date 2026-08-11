/**
 * Place Chat active viewers — session-scoped roster from viewer_prefs
 * (not place_chat_follows). Used for participants UI only.
 */

export type PlaceChatViewerPref = {
  uid: string
  displayName: string
  language: string
  updatedAtMs: number
}

export function isPlaceChatViewerRecentlyActive(
  updatedAtMs: number | null | undefined,
  nowMs: number = Date.now(),
  activeWindowMs: number = 2 * 60 * 60 * 1000,
): boolean {
  if (updatedAtMs == null || !Number.isFinite(updatedAtMs)) return false
  return updatedAtMs > nowMs - activeWindowMs
}

export function mapPlaceChatViewerPrefDoc(args: {
  uid: string
  language?: unknown
  displayName?: unknown
  updatedAtMs?: number | null
}): PlaceChatViewerPref | null {
  const uid = args.uid.trim()
  if (!uid) return null
  const language =
    typeof args.language === 'string' && args.language.trim().length >= 2
      ? args.language.trim().slice(0, 12)
      : 'en'
  const rawName =
    typeof args.displayName === 'string' ? args.displayName.trim() : ''
  const displayName = rawName || 'Traveler'
  const updatedAtMs =
    typeof args.updatedAtMs === 'number' && Number.isFinite(args.updatedAtMs)
      ? args.updatedAtMs
      : 0
  return { uid, displayName, language, updatedAtMs }
}

export function filterRecentPlaceChatViewers(
  viewers: PlaceChatViewerPref[],
  nowMs: number = Date.now(),
  activeWindowMs: number = 2 * 60 * 60 * 1000,
): PlaceChatViewerPref[] {
  return viewers
    .filter(v => isPlaceChatViewerRecentlyActive(v.updatedAtMs, nowMs, activeWindowMs))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
