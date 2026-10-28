/**
 * Public Place directory (website browse, search and "find your business").
 * Data comes from the `getPublicPlaceDirectory` Cloud Function: Places public
 * on Nessa (discoverable, or managed by a verified business).
 *
 * Pure helpers here; the server fetch lives in `place-directory-server.ts`
 * and the browser photo fetch in `place-directory-client.ts`.
 */

import { isValidPlaceSlug, placeCanonicalPath } from '@/lib/place-slug'

export type DirectoryPlace = {
  placeId: string
  slug?: string
  name: string
  city: string
  country?: string
  placeType: string
  recommenderCount: number
  storyCount: number
  visitedCount: number
  verified: boolean
  /** Only keyless photo URLs travel in server HTML; others load in the browser. */
  photoUrl?: string
  lastActivityAt?: number
}

export type DirectoryData = {
  places: DirectoryPlace[]
  total: number
  generatedAt: number
}

export type PlaceCategory = 'all' | 'stay' | 'eat' | 'beach' | 'do'

export const PLACE_CATEGORIES: { value: PlaceCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'stay', label: 'Stay' },
  { value: 'eat', label: 'Eat & drink' },
  { value: 'beach', label: 'Beaches' },
  { value: 'do', label: 'Things to do' },
]

/** Place type (from Google types or older free text) → browse category. */
export function placeCategory(placeType: string): Exclude<PlaceCategory, 'all'> | null {
  const t = placeType.toLowerCase()
  if (/hotel|hostel|lodging|pousada|inn|resort|guest|stay|apartment|camp/.test(t)) return 'stay'
  if (/caf|coffee|restaurant|bar|food|bakery|meal|pub/.test(t)) return 'eat'
  if (/beach|natural|lagoon|lake|dune/.test(t)) return 'beach'
  if (/tour|attraction|museum|park|school|kite|surf|activity|point_of_interest/.test(t)) return 'do'
  return null
}

const TYPE_LABELS: Record<string, string> = {
  locality: 'Town',
  lodging: 'Stay',
  point_of_interest: 'Attraction',
  administrative_area_level_1: 'Region',
}

/** "lodging" → "Stay", "Café" stays "Café". */
export function placeTypeLabel(placeType: string): string {
  const raw = placeType.trim()
  if (!raw) return 'Place'
  const mapped = TYPE_LABELS[raw.toLowerCase()]
  if (mapped) return mapped
  const spaced = raw.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function placeHref(place: Pick<DirectoryPlace, 'placeId' | 'slug'>): string {
  return place.slug && isValidPlaceSlug(place.slug)
    ? placeCanonicalPath(place.slug)
    : `/place/${encodeURIComponent(place.placeId)}`
}

/** Lowercase, no accents, single spaces: "  Café  do Vento" → "cafe do vento". */
export function foldText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Search by name, town or country. Every query word must match the start of
 * a word; name matches rank above town matches. Empty query → input order.
 */
export function searchPlaces(places: DirectoryPlace[], query: string): DirectoryPlace[] {
  const words = foldText(query).split(' ').filter(Boolean)
  if (words.length === 0) return places
  const scored: { place: DirectoryPlace; score: number; index: number }[] = []
  places.forEach((place, index) => {
    const name = foldText(place.name)
    const nameWords = name.split(' ')
    const where = foldText(`${place.city} ${place.country ?? ''}`).split(' ')
    let score = 0
    for (const w of words) {
      if (nameWords.some(n => n.startsWith(w))) score += name.startsWith(w) ? 4 : 3
      else if (where.some(n => n.startsWith(w))) score += 1
      else return
    }
    scored.push({ place, score, index })
  })
  return scored.sort((a, b) => b.score - a.score || a.index - b.index).map(s => s.place)
}

export function filterByCategory(places: DirectoryPlace[], category: PlaceCategory): DirectoryPlace[] {
  return category === 'all' ? places : places.filter(p => placeCategory(p.placeType) === category)
}

export function filterByTown(places: DirectoryPlace[], town: string | null): DirectoryPlace[] {
  if (!town) return places
  const key = foldText(town)
  return places.filter(p => foldText(p.city) === key)
}

/** Towns with the most Places (excludes empty city names). */
export function topTowns(places: DirectoryPlace[], max = 8): { town: string; count: number }[] {
  const counts = new Map<string, { town: string; count: number }>()
  for (const p of places) {
    const town = p.city.trim()
    if (!town) continue
    const key = foldText(town)
    const entry = counts.get(key)
    if (entry) entry.count += 1
    else counts.set(key, { town, count: 1 })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.town.localeCompare(b.town)).slice(0, max)
}

/** Whole numbers stay readable: 1234 → "1.2k". */
export function compactCount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

/** Drops key-bearing Google photo URLs (they must not be cached in HTML). */
export function stripKeyedPhoto(place: DirectoryPlace): DirectoryPlace {
  if (!place.photoUrl) return place
  if (/[?&]key=/.test(place.photoUrl) || !place.photoUrl.startsWith('https://')) {
    return { ...place, photoUrl: undefined }
  }
  return place
}

/** Validates one row from the callable (defensive: the HTML depends on it). */
export function parseDirectoryPlace(raw: unknown): DirectoryPlace | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0)
  const placeId = s(r.placeId)
  const name = s(r.name).trim()
  if (!/^ChIJ[A-Za-z0-9_-]+$/.test(placeId) || !name) return null
  const place: DirectoryPlace = {
    placeId,
    name,
    city: s(r.city),
    placeType: s(r.placeType) || 'Place',
    recommenderCount: n(r.recommenderCount),
    storyCount: n(r.storyCount),
    visitedCount: n(r.visitedCount),
    verified: r.verified === true,
  }
  if (isValidPlaceSlug(s(r.slug))) place.slug = s(r.slug)
  if (s(r.country)) place.country = s(r.country)
  if (s(r.photoUrl).startsWith('https://')) place.photoUrl = s(r.photoUrl)
  if (typeof r.lastActivityAt === 'number') place.lastActivityAt = r.lastActivityAt
  return place
}
