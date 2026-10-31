import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { PlaceVisitTracker } from '@/components/place/place-visit-tracker'
import { PlaceView } from '@/components/place/place-view'
import { SiteShell } from '@/components/site/site-shell'
import { getPlaceSurroundings } from '@/lib/place-hubs-server'
import { buildPlaceSeoMetadata } from '@/lib/place-page-metadata'
import {
  PLACE_SHARE_BRAND,
  buildPlacePageTitle,
  getCachedPublicPlaceLanding,
  getCachedPublicPlaceShareMeta,
  placeFallbackOgImageUrl,
  toSsrSafeLanding,
} from '@/lib/place-share-meta'
import { buildPlaceBreadcrumbJsonLd, buildPlaceJsonLd, serializeJsonLd } from '@/lib/place-seo'
import { isValidPlaceSlug, placeCanonicalPath, placeCanonicalUrlForSlug } from '@/lib/place-slug'
import { resolvePlaceSlug, type PlaceSlugResolution } from '@/lib/place-slug-store'

/**
 * Static with revalidation (ISR): the CDN serves the page; it is rebuilt at
 * most every 10 minutes per Place, from the same cached data as before (one
 * getPublicPlaceLanding call and one place_slugs read per Place per window,
 * plus the shared directory). Query strings (?ref=qr, utm_*) don't change
 * the HTML: the visit tracker reads them in the browser.
 */
export const revalidate = 600

/** No Place is prerendered at build; each renders on its first visit, then is cached. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return []
}

type PageProps = {
  params: Promise<{ slug: string }>
}

function decodeSlug(raw: string | undefined): string {
  try {
    return decodeURIComponent(raw || '').trim()
  } catch {
    return ''
  }
}

async function safeResolve(slug: string): Promise<PlaceSlugResolution | null | 'error'> {
  try {
    return await resolvePlaceSlug(slug)
  } catch {
    return 'error'
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = decodeSlug((await params).slug)
  const resolution = isValidPlaceSlug(slug) ? await safeResolve(slug) : null

  if (resolution === null) {
    return {
      title: `Place not found | ${PLACE_SHARE_BRAND}`,
      robots: { index: false, follow: false },
    }
  }

  const canonicalSlug =
    resolution !== 'error' && resolution.canonicalSlug ? resolution.canonicalSlug : slug
  const canonical = placeCanonicalUrlForSlug(canonicalSlug)
  const share =
    resolution !== 'error' ? await getCachedPublicPlaceShareMeta(resolution.placeId) : null

  if (!share) {
    // Data temporarily unavailable — keep the canonical, don't de-index.
    return {
      title: buildPlacePageTitle(),
      description: `See this place on ${PLACE_SHARE_BRAND} and recommend it to travelers.`,
      alternates: { canonical },
      openGraph: {
        title: buildPlacePageTitle(),
        url: canonical,
        siteName: PLACE_SHARE_BRAND,
        type: 'website',
        images: [placeFallbackOgImageUrl()],
      },
    }
  }
  return buildPlaceSeoMetadata(share, canonical)
}

/**
 * Canonical public Place page: `/places/{slug}`. Rendered on the server
 * (mostly Server Components) so search engines and link previews get the
 * real content. Retired/renamed slugs and non-lowercase variants
 * permanently redirect here. (Being static, those redirects can't carry the
 * query string; QR codes and shared links use `/place/{id}?ref=…`, which
 * still does — see app/place/[placeId].)
 */
export default async function PlaceSlugPage({ params }: PageProps) {
  const rawSlug = decodeSlug((await params).slug)

  const lower = rawSlug.toLowerCase()
  if (lower !== rawSlug && isValidPlaceSlug(lower)) {
    permanentRedirect(placeCanonicalPath(lower))
  }
  if (!isValidPlaceSlug(rawSlug)) {
    notFound()
  }

  // Throws on a Firestore outage → error (never cached) rather than a false 404.
  const resolution = await resolvePlaceSlug(rawSlug)
  if (!resolution) {
    notFound()
  }
  if (resolution.canonicalSlug && resolution.canonicalSlug !== rawSlug) {
    permanentRedirect(placeCanonicalPath(resolution.canonicalSlug))
  }

  const canonicalSlug = resolution.canonicalSlug ?? rawSlug
  const landing = await getCachedPublicPlaceLanding(resolution.placeId)
  if (!landing) {
    // Don't cache an empty page: a failed regeneration keeps serving the
    // last good one; a first visit gets an error and the next one retries.
    throw new Error('place landing unavailable')
  }
  const place = toSsrSafeLanding(landing)
  // Sanitized subset (no key-bearing URLs, no Google photo) for structured data.
  const share = await getCachedPublicPlaceShareMeta(resolution.placeId)
  const surroundings = await getPlaceSurroundings({
    placeId: resolution.placeId,
    city: place.city,
    country: place.country,
  })
  const canonicalUrl = placeCanonicalUrlForSlug(canonicalSlug)
  const jsonLd = share ? buildPlaceJsonLd(share, canonicalUrl) : null
  const trail = [
    ...(surroundings.country ? [{ name: surroundings.country.name, path: surroundings.country.path }] : []),
    ...(surroundings.city ? [{ name: surroundings.city.cityName, path: surroundings.city.path }] : []),
  ]
  const breadcrumbLd = share ? buildPlaceBreadcrumbJsonLd(share, canonicalUrl, trail) : null

  return (
    <SiteShell bottomBar>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // Escaped via serializeJsonLd (no `</script>` breakout possible).
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      ) : null}
      {breadcrumbLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
        />
      ) : null}
      <PlaceVisitTracker placeId={resolution.placeId} />
      <PlaceView
        place={place}
        placeId={resolution.placeId}
        slug={canonicalSlug}
        hubs={{ country: surroundings.country, city: surroundings.city }}
        moreInCity={surroundings.more}
      />
    </SiteShell>
  )
}
