import type { Metadata } from 'next'

import { PlaceLandingClient } from './place-landing-client'
import { isPublicPlaceIdValid } from '@/lib/place-landing'
import {
  PLACE_FALLBACK_OG_IMAGE,
  PLACE_SHARE_BRAND,
  buildGenericPlaceMetadata,
  buildPlacePageTitle,
  buildPlaceShareDescription,
  getCachedPublicPlaceShareMeta,
} from '@/lib/place-share-meta'

type PageProps = {
  params: Promise<{ placeId: string }>
}

function placeOgImages(
  imageUrl: string,
  alt: string,
  opts?: { width?: number; height?: number },
): NonNullable<NonNullable<Metadata['openGraph']>['images']> {
  const isFallback = imageUrl === PLACE_FALLBACK_OG_IMAGE.url
  if (isFallback) {
    return [
      {
        url: PLACE_FALLBACK_OG_IMAGE.url,
        width: PLACE_FALLBACK_OG_IMAGE.width,
        height: PLACE_FALLBACK_OG_IMAGE.height,
        type: PLACE_FALLBACK_OG_IMAGE.type,
        alt,
      },
    ]
  }
  return [
    {
      url: imageUrl,
      alt,
      ...(opts?.width ? { width: opts.width } : {}),
      ...(opts?.height ? { height: opts.height } : {}),
    },
  ]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { placeId: raw } = await params
  const placeId = decodeURIComponent(raw || '').trim()
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

export default async function PlaceLandingPage({ params }: PageProps) {
  const { placeId: raw } = await params
  const placeId = decodeURIComponent(raw || '').trim()

  return <PlaceLandingClient placeId={placeId} />
}
