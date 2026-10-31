import type { MetadataRoute } from 'next'

import { PLACE_PUBLIC_ORIGIN } from '@/lib/place-slug'
import { ROBOTS_DISALLOW } from '@/lib/site-crawl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...ROBOTS_DISALLOW],
    },
    sitemap: `${PLACE_PUBLIC_ORIGIN}/sitemap.xml`,
    host: PLACE_PUBLIC_ORIGIN,
  }
}
