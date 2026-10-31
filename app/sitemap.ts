import type { MetadataRoute } from 'next'

import { PLACE_PUBLIC_ORIGIN, placeCanonicalUrlForSlug } from '@/lib/place-slug'
import { getCachedIndexablePlaceSlugs } from '@/lib/place-slug-store'
import { SITEMAP_STATIC_PATHS } from '@/lib/site-crawl'

/** Regenerate hourly so new / newly-indexable Places appear without a deploy. */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = SITEMAP_STATIC_PATHS.map(path => ({
    url: `${PLACE_PUBLIC_ORIGIN}${path === '/' ? '' : path}`,
  }))

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
