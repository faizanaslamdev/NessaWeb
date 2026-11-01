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
import { placeShareImageUrl } from '@/lib/place-public-view'
import {
  buildPlaceSeoDescription,
  buildPlaceSeoTitle,
  placeRobots,
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
  // Our own cover (or the business's); never Google's photo. Otherwise the
  // compact brand icon.
  const cover = placeShareImageUrl(share)
  const hasCover = Boolean(cover)
  const ogImage = cover ?? PLACE_FALLBACK_OG_IMAGE.url
  return {
    title,
    description,
    alternates: { canonical },
    robots: placeRobots(share),
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
