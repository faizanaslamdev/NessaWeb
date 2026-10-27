/**
 * Shared Next.js Metadata builder for public Place pages (canonical slug
 * pages and legacy id pages).
 */

import type { Metadata } from 'next'

import {
  PLACE_FALLBACK_OG_IMAGE,
  PLACE_SHARE_BRAND,
  type PublicPlaceShareMeta,
} from '@/lib/place-share-meta'
import {
  buildPlaceSeoDescription,
  buildPlaceSeoTitle,
  isPlaceIndexable,
} from '@/lib/place-seo'

export function placeOgImages(
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

/** Full metadata for a Place we have data for. */
export function buildPlaceSeoMetadata(
  share: PublicPlaceShareMeta,
  canonical: string,
): Metadata {
  const title = buildPlaceSeoTitle(share)
  const description = buildPlaceSeoDescription(share)
  // Cover only when public HTTPS without API keys; otherwise compact brand icon.
  const hasCover = Boolean(share.coverImageUrl)
  const ogImage = share.coverImageUrl ?? PLACE_FALLBACK_OG_IMAGE.url
  return {
    title,
    description,
    alternates: { canonical },
    robots: isPlaceIndexable(share)
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
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
