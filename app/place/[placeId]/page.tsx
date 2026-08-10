import type { Metadata } from 'next'

import { PlaceLandingClient } from './place-landing-client'
import { siteConfig } from '@/lib/constants'
import { isPublicPlaceIdValid } from '@/lib/place-landing'

type PageProps = {
  params: Promise<{ placeId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { placeId: raw } = await params
  const placeId = decodeURIComponent(raw || '').trim()
  const valid = isPublicPlaceIdValid(placeId)
  const path = `/place/${encodeURIComponent(placeId || 'unknown')}`

  return {
    title: valid
      ? `Place on ${siteConfig.name}`
      : `Invalid place | ${siteConfig.name}`,
    description: valid
      ? `See this place on ${siteConfig.name} and recommend it to travelers.`
      : `This place link is not valid.`,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      title: valid
        ? `Recommend this place on ${siteConfig.name}`
        : siteConfig.name,
      description: valid
        ? `Open the place page, then recommend it in the ${siteConfig.name} app.`
        : siteConfig.description,
      url: path,
      siteName: siteConfig.name,
      type: 'website',
    },
  }
}

export default async function PlaceLandingPage({ params }: PageProps) {
  const { placeId: raw } = await params
  const placeId = decodeURIComponent(raw || '').trim()

  return <PlaceLandingClient placeId={placeId} />
}
