/**
 * Places an admin pinned to the console Overview. Stored per browser
 * (localStorage) — a convenience, not shared state.
 */

export type PinnedPlace = { placeId: string; name: string; city: string | null; slug: string | null }

const KEY = 'nessa.admin.pinnedPlaces'
const MAX = 8

export function readPinnedPlaces(): PinnedPlace[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(list)
      ? list
          .filter((p): p is PinnedPlace => Boolean(p && typeof p.placeId === 'string' && typeof p.name === 'string'))
          .slice(0, MAX)
      : []
  } catch {
    return []
  }
}

export function togglePinnedPlace(place: PinnedPlace): PinnedPlace[] {
  const list = readPinnedPlaces()
  const next = list.some(p => p.placeId === place.placeId)
    ? list.filter(p => p.placeId !== place.placeId)
    : [place, ...list].slice(0, MAX)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore (private mode)
  }
  return next
}
