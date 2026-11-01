/**
 * Destination hubs on the server, derived from the cached Place directory
 * (lib/place-directory-server.ts): no reads of their own.
 */

import type { DirectoryPlace } from '@/lib/place-directory'
import { getPlaceDirectory } from '@/lib/place-directory-server'
import { buildPlaceHubs, hubsForPlace, moreInCity, type PlaceHubs } from '@/lib/place-geo'

/**
 * Hubs plus the directory they came from. Same failure rules as
 * getPlaceDirectory: null during `next build` if the directory can't be
 * loaded (pages then render on demand); at runtime the error is re-thrown so
 * ISR keeps serving the last good page.
 */
export async function getPlaceHubs(): Promise<{ hubs: PlaceHubs; places: DirectoryPlace[] } | null> {
  const directory = await getPlaceDirectory()
  if (!directory) return null
  return { hubs: buildPlaceHubs(directory.places), places: directory.places }
}

/** Best effort (sitemap, "More in {city}"): null instead of throwing. */
export async function getPlaceHubsSafe(): Promise<{ hubs: PlaceHubs; places: DirectoryPlace[] } | null> {
  try {
    return await getPlaceHubs()
  } catch {
    return null
  }
}

/**
 * A Place's destination pages and "More in {town}" list, from the cached
 * directory (best effort: empty when it can't be loaded).
 */
export async function getPlaceSurroundings(place: {
  placeId: string
  city?: string | null
  country?: string | null
}): Promise<{
  country: { name: string; path: string } | null
  city: { cityName: string; path: string } | null
  more: DirectoryPlace[]
}> {
  const data = await getPlaceHubsSafe()
  if (!data) return { country: null, city: null, more: [] }
  const found = hubsForPlace(data.hubs, place)
  return {
    country: found.country ? { name: found.country.name, path: found.country.path } : null,
    city: found.city ? { cityName: found.city.cityName, path: found.city.path } : null,
    more: moreInCity(data.places, place, 6),
  }
}
