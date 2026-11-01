import type { MetadataRoute } from 'next'

import type { DirectoryPlace } from '@/lib/place-directory'
import { getPlaceHubsSafe } from '@/lib/place-hubs-server'
import { PLACE_PUBLIC_ORIGIN, placeCanonicalUrlForSlug } from '@/lib/place-slug'
import { getCachedIndexablePlaceSlugs } from '@/lib/place-slug-store'
import { SITEMAP_STATIC_PATHS } from '@/lib/site-crawl'

/** Regenerate hourly so new / newly-indexable Places appear without a deploy. */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = SITEMAP_STATIC_PATHS.map(path => ({
    url: `${PLACE_PUBLIC_ORIGIN}${path === '/' ? '' : path}`,
  }))

  // Destination hubs (countries and towns with ≥3 indexable Places), from
  // the cached directory: no reads of their own.
  const data = await getPlaceHubsSafe()
  if (data) {
    for (const hub of [...data.hubs.countries, ...data.hubs.cities]) {
      const lastModified = latestActivity(hub.places)
      entries.push({
        url: `${PLACE_PUBLIC_ORIGIN}${hub.path}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: 'weekly',
      })
    }
  }

  // Only canonical slugs of indexable Places (same rule as the page's robots
  // meta: Nessa-native content or a verified business) — never legacy /place/{id} URLs or retired slugs.
  const places = await getCachedIndexablePlaceSlugs()
  for (const place of places) {
    entries.push({
      url: placeCanonicalUrlForSlug(place.slug),
      ...(place.updatedAt ? { lastModified: place.updatedAt } : {}),
      changeFrequency: 'weekly',
    })
  }
  return entries
}

function latestActivity(places: DirectoryPlace[]): Date | null {
  let latest = 0
  for (const p of places) if (p.lastActivityAt && p.lastActivityAt > latest) latest = p.lastActivityAt
  return latest > 0 ? new Date(latest) : null
}
