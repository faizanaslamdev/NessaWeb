import type { MetadataRoute } from 'next'

import { PLACE_PUBLIC_ORIGIN } from '@/lib/place-slug'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Live chat rooms and auth handlers aren't content pages.
      disallow: ['/chat', '/auth', '/__/', '/account', '/business'],
    },
    sitemap: `${PLACE_PUBLIC_ORIGIN}/sitemap.xml`,
    host: PLACE_PUBLIC_ORIGIN,
  }
}
