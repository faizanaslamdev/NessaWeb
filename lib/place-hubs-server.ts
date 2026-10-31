/**
 * Destination hubs on the server, derived from the cached Place directory
 * (lib/place-directory-server.ts): no reads of their own.
 */

import type { DirectoryPlace } from '@/lib/place-directory'
import { getPlaceDirectory } from '@/lib/place-directory-server'
import { buildPlaceHubs, type PlaceHubs } from '@/lib/place-geo'

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
