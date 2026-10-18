import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'

import { PlaceLandingClient } from './place-landing-client'
import { PlaceVisitTracker } from '@/components/place/place-visit-tracker'
import { isPublicPlaceIdValid } from '@/lib/place-landing'
import { buildPlaceSeoMetadata, placeOgImages } from '@/lib/place-page-metadata'
import {
  PLACE_SHARE_BRAND,
  buildGenericPlaceMetadata,
  buildPlacePageTitle,
  buildPlaceShareDescription,
  getCachedPublicPlaceLanding,
  getCachedPublicPlaceShareMeta,
  toSsrSafeLanding,
} from '@/lib/place-share-meta'
import {
  isValidPlaceSlug,
  placeCanonicalPath,
  placeCanonicalUrlForSlug,
  searchParamsToQueryString,
} from '@/lib/place-slug'
import { getCanonicalSlugForPlaceId } from '@/lib/place-slug-store'

type PageProps = {
  params: Promise<{ placeId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function decodePlaceId(raw: string | undefined): string {
  try {
    return decodeURIComponent(raw || '').trim()
  } catch {
    return (raw || '').trim()
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { placeId: raw } = await params
  const placeId = decodePlaceId(raw)
  const valid = isPublicPlaceIdValid(placeId)

  if (!valid) {
    const fallback = buildGenericPlaceMetadata({ placeId, validId: false })
    return {
      title: fallback.title,
      description: fallback.description,
      alternates: { canonical: fallback.canonical },
      robots: { index: false, follow: false },
      openGraph: {
        title: fallback.ogTitle,
        description: fallback.ogDescription,
        url: fallback.canonical,
        siteName: PLACE_SHARE_BRAND,
        type: 'website',
        images: placeOgImages(fallback.ogImage, PLACE_SHARE_BRAND),
      },
      twitter: {
        // Compact card — matches small brand icon (avoids huge WA preview).
        card: 'summary',
        title: fallback.ogTitle,
        description: fallback.ogDescription,
        images: [fallback.ogImage],
      },
    }
  }

  const share = await getCachedPublicPlaceShareMeta(placeId)
  // Nessa Places with a slug: the page permanently redirects to
  // `/places/{slug}`; point metadata at that canonical URL too.
  const slug = share?.slug ?? (await getCanonicalSlugForPlaceId(placeId))
  if (share && slug) {
    return buildPlaceSeoMetadata(share, placeCanonicalUrlForSlug(slug))
  }
  const generic = buildGenericPlaceMetadata({ placeId, validId: true })

  if (!share) {
    return {
      title: generic.title,
      description: generic.description,
      alternates: { canonical: generic.canonical },
      robots: { index: true, follow: true },
      openGraph: {
        title: generic.ogTitle,
        description: generic.ogDescription,
        url: generic.canonical,
        siteName: PLACE_SHARE_BRAND,
        type: 'website',
        images: placeOgImages(generic.ogImage, PLACE_SHARE_BRAND),
      },
      twitter: {
        card: 'summary',
        title: generic.ogTitle,
        description: generic.ogDescription,
        images: [generic.ogImage],
      },
    }
  }

  const title = buildPlacePageTitle(share.name)
  const description = buildPlaceShareDescription(share)
  // Cover only when public HTTPS without API keys; otherwise compact brand icon.
  const hasCover = Boolean(share.coverImageUrl)
  const ogImage = share.coverImageUrl ?? generic.ogImage

  return {
    title,
    description,
    alternates: { canonical: generic.canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: generic.canonical,
      siteName: PLACE_SHARE_BRAND,
      type: 'website',
      images: placeOgImages(ogImage, share.name),
    },
    twitter: {
      // Large only for real Place photos; brand fallback stays compact.
      card: hasCover ? 'summary_large_image' : 'summary',
      title,
      description,
      images: [ogImage],
    },
  }
}

/**
 * Legacy Place URL: `/place/{googlePlaceId}` (every QR/link shared before
 * slugs). Places that have a public slug permanently redirect (308) to the
 * canonical `/places/{slug}` page, keeping the query string so tracking params
 * survive. Places without a slug — or if the slug lookup is unavailable —
 * render here exactly as before, so no existing link ever breaks.
 */
export default async function PlaceLandingPage({ params, searchParams }: PageProps) {
  const { placeId: raw } = await params
  const placeId = decodePlaceId(raw)

  const valid = isPublicPlaceIdValid(placeId)
  const [slugFromIndex, landing] = valid
    ? await Promise.all([
        getCanonicalSlugForPlaceId(placeId),
        getCachedPublicPlaceLanding(placeId),
      ])
    : [null, null]
  // Either source is authoritative for the Place's current slug.
  const slug = slugFromIndex ?? (isValidPlaceSlug(landing?.slug) ? landing?.slug : null)
  if (slug) {
    const query = searchParamsToQueryString(await searchParams)
    permanentRedirect(`${placeCanonicalPath(slug)}${query}`)
  }

  return (
    <>
      <PlaceVisitTracker placeId={placeId} />
      <PlaceLandingClient
        placeId={placeId}
        initialPlace={landing ? toSsrSafeLanding(landing) : null}
      />
    </>
  )
}
