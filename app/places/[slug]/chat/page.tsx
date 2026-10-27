import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'

import PlaceChatRoom from '@/components/chat/place-chat-room'
import {
  PLACE_SHARE_BRAND,
  buildPlacePageTitle,
  getCachedPublicPlaceShareMeta,
} from '@/lib/place-share-meta'
import {
  isValidPlaceSlug,
  placeChatCanonicalPath,
  searchParamsToQueryString,
} from '@/lib/place-slug'
import { resolvePlaceSlug } from '@/lib/place-slug-store'

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = decodeSlug((await params).slug)
  let name: string | undefined
  if (isValidPlaceSlug(slug)) {
    try {
      const resolution = await resolvePlaceSlug(slug)
      if (resolution) {
        name = (await getCachedPublicPlaceShareMeta(resolution.placeId))?.name
      }
    } catch {
      // metadata is best-effort
    }
  }
  return {
    title: name ? `Live Chat · ${buildPlacePageTitle(name)}` : `Live Chat | ${PLACE_SHARE_BRAND}`,
    // Live chat rooms are not content pages; the Place page is the canonical one.
    robots: { index: false, follow: true },
  }
}

/**
 * Clean web Place Chat URL: `/places/{slug}/chat` — straight into the Place's
 * live chat (no app needed). Retired slugs 308 to the current slug; unknown
 * slugs 404. Tracking params (`?ref=qr&qr=bar`) are kept across redirects and
 * read by the chat's join tracker.
 */
export default async function PlaceSlugChatPage({ params, searchParams }: PageProps) {
  const rawSlug = decodeSlug((await params).slug)
  const query = searchParamsToQueryString(await searchParams)

  const lower = rawSlug.toLowerCase()
  if (lower !== rawSlug && isValidPlaceSlug(lower)) {
    permanentRedirect(`${placeChatCanonicalPath(lower)}${query}`)
  }
  if (!isValidPlaceSlug(rawSlug)) {
    notFound()
  }
  const resolution = await resolvePlaceSlug(rawSlug)
  if (!resolution) {
    notFound()
  }
  if (resolution.canonicalSlug && resolution.canonicalSlug !== rawSlug) {
    permanentRedirect(`${placeChatCanonicalPath(resolution.canonicalSlug)}${query}`)
  }
  const canonicalSlug = resolution.canonicalSlug ?? rawSlug
  const share = await getCachedPublicPlaceShareMeta(resolution.placeId)

  return (
    <Suspense fallback={null}>
      <PlaceChatRoom
        placeId={resolution.placeId}
        slug={canonicalSlug}
        placeName={share?.name ?? null}
      />
    </Suspense>
  )
}
