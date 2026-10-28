import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { PlaceLandingClient } from '@/app/place/[placeId]/place-landing-client'
import { PlaceVisitTracker } from '@/components/place/place-visit-tracker'
import { SiteShell } from '@/components/site/site-shell'
import { buildPlaceSeoMetadata } from '@/lib/place-page-metadata'
import {
  PLACE_SHARE_BRAND,
  buildPlacePageTitle,
  getCachedPublicPlaceLanding,
  getCachedPublicPlaceShareMeta,
  placeFallbackOgImageUrl,
  toSsrSafeLanding,
} from '@/lib/place-share-meta'
import { buildPlaceJsonLd, serializeJsonLd } from '@/lib/place-seo'
import {
  isValidPlaceSlug,
  placeCanonicalPath,
  placeCanonicalUrlForSlug,
  searchParamsToQueryString,
} from '@/lib/place-slug'
import { resolvePlaceSlug, type PlaceSlugResolution } from '@/lib/place-slug-store'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
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
 * Canonical public Place page: `/places/{slug}`. Server-rendered so search
 * engines and link previews get the real content; interactive parts hydrate
 * on the client. Retired/renamed slugs and non-lowercase variants
 * permanently redirect here; tracking params are preserved on redirect.
 */
export default async function PlaceSlugPage({ params, searchParams }: PageProps) {
  const rawSlug = decodeSlug((await params).slug)
  const query = searchParamsToQueryString(await searchParams)

  const lower = rawSlug.toLowerCase()
  if (lower !== rawSlug && isValidPlaceSlug(lower)) {
    permanentRedirect(`${placeCanonicalPath(lower)}${query}`)
  }
  if (!isValidPlaceSlug(rawSlug)) {
    notFound()
  }

  // Throws on a Firestore outage → error page (5xx) rather than a false 404.
  const resolution = await resolvePlaceSlug(rawSlug)
  if (!resolution) {
    notFound()
  }
  if (resolution.canonicalSlug && resolution.canonicalSlug !== rawSlug) {
    permanentRedirect(`${placeCanonicalPath(resolution.canonicalSlug)}${query}`)
  }

  const canonicalSlug = resolution.canonicalSlug ?? rawSlug
  const landing = await getCachedPublicPlaceLanding(resolution.placeId)
  // Sanitized subset (no key-bearing URLs) for structured data.
  const share = await getCachedPublicPlaceShareMeta(resolution.placeId)
  const jsonLd = share
    ? buildPlaceJsonLd(share, placeCanonicalUrlForSlug(canonicalSlug))
    : null

  return (
    <SiteShell bottomBar>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // Escaped via serializeJsonLd (no `</script>` breakout possible).
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      ) : null}
      <PlaceVisitTracker placeId={resolution.placeId} />
      <PlaceLandingClient
        placeId={resolution.placeId}
        slug={canonicalSlug}
        initialPlace={landing ? toSsrSafeLanding(landing) : null}
      />
    </SiteShell>
  )
}
