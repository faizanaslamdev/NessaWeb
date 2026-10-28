import type { MetadataRoute } from 'next'

import { PLACE_PUBLIC_ORIGIN, placeCanonicalUrlForSlug } from '@/lib/place-slug'
import { getCachedIndexablePlaceSlugs } from '@/lib/place-slug-store'

/** Regenerate hourly so new / newly-indexable Places appear without a deploy. */
export const revalidate = 3600

const STATIC_PATHS = [
  '/',
  '/places',
  '/chat',
  '/about',
  '/for-businesses',
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
  '/acceptable-use',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(path => ({
    url: `${PLACE_PUBLIC_ORIGIN}${path === '/' ? '' : path}`,
  }))

  // Only canonical slugs of Places with Nessa-native content (same rule as
  // the page's robots meta) — never legacy /place/{id} URLs or retired slugs.
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
