import type { Metadata } from 'next'
import { Suspense } from 'react'
import { permanentRedirect } from 'next/navigation'

import PlaceChatRoom from '@/components/chat/place-chat-room'
import { isPublicPlaceIdValid } from '@/lib/place-landing'
import {
  PLACE_SHARE_BRAND,
  getCachedPublicPlaceShareMeta,
} from '@/lib/place-share-meta'
import {
  isValidPlaceSlug,
  placeChatCanonicalPath,
  searchParamsToQueryString,
} from '@/lib/place-slug'
import { getCanonicalSlugForPlaceId } from '@/lib/place-slug-store'

type PageProps = {
  params: Promise<{ placeId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata: Metadata = {
  title: `Live Chat | ${PLACE_SHARE_BRAND}`,
  robots: { index: false, follow: true },
}

/**
 * Legacy web Place Chat URL: `/place/{googlePlaceId}/chat`. Used by printed
 * chat QR codes while the legacy-path switch is on (every installed app
 * version opens `/place/*`). Browsers 308 to `/places/{slug}/chat` once the
 * Place has a slug; otherwise the chat renders here directly.
 */
export default async function PlaceLegacyChatPage({ params, searchParams }: PageProps) {
  const { placeId: raw } = await params
  let placeId = ''
  try {
    placeId = decodeURIComponent(raw || '').trim()
  } catch {
    placeId = (raw || '').trim()
  }
  if (!isPublicPlaceIdValid(placeId)) {
    permanentRedirect('/chat')
  }

  const [slugFromIndex, share] = await Promise.all([
    getCanonicalSlugForPlaceId(placeId),
    getCachedPublicPlaceShareMeta(placeId),
  ])
  const slug = slugFromIndex ?? (isValidPlaceSlug(share?.slug) ? share?.slug : null)
  if (slug) {
    const query = searchParamsToQueryString(await searchParams)
    permanentRedirect(`${placeChatCanonicalPath(slug)}${query}`)
  }

  return (
    <Suspense fallback={null}>
      <PlaceChatRoom placeId={placeId} placeName={share?.name ?? null} />
    </Suspense>
  )
}
