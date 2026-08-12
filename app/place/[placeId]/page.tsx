import type { Metadata } from 'next'

import { PlaceLandingClient } from './place-landing-client'
import { isPublicPlaceIdValid } from '@/lib/place-landing'
import {
  PLACE_SHARE_BRAND,
  buildGenericPlaceMetadata,
  buildPlacePageTitle,
  buildPlaceShareDescription,
  getCachedPublicPlaceShareMeta,
} from '@/lib/place-share-meta'

type PageProps = {
  params: Promise<{ placeId: string }>
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
        images: [{ url: fallback.ogImage }],
      },
      twitter: {
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
        images: [{ url: generic.ogImage }],
      },
      twitter: {
        card: 'summary_large_image',
        title: generic.ogTitle,
        description: generic.ogDescription,
        images: [generic.ogImage],
      },
    }
  }

  const title = buildPlacePageTitle(share.name)
  const description = buildPlaceShareDescription(share)
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
      images: [{ url: ogImage, alt: share.name }],
    },
    twitter: {
      card: 'summary_large_image',
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
