'use client'

import { useEffect, useRef } from 'react'

import { isPublicPlaceIdValid, recordPlaceLinkVisit } from '@/lib/place-landing'
import {
  classifyPlaceLinkSource,
  recallPlaceLinkSource,
  rememberPlaceLinkSource,
  stripPlaceTrackingParams,
} from '@/lib/place-link-source'

/**
 * Counts one Place Chat join per Place per tab session, credited to the
 * source that brought the visitor: tracking params on the chat URL itself
 * (a chat QR / pre-arrival link), else the source remembered by the Place
 * page in this tab, else the referrer. Aggregate-only; never blocks the chat.
 */
export function PlaceChatJoinTracker({
  placeId,
  joined,
}: {
  placeId: string
  joined: boolean
}) {
  const countedRef = useRef(false)

  // Attribute + clean the URL on mount (before any join).
  useEffect(() => {
    if (!isPublicPlaceIdValid(placeId)) {
      return
    }
    let session: Storage | null = null
    try {
      session = window.sessionStorage
    } catch {
      // storage unavailable
    }
    const params = new URLSearchParams(window.location.search)
    const hasTag =
      params.has('ref') || params.has('utm_source') || params.has('utm_medium')
    if (hasTag || !recallPlaceLinkSource(session, placeId)) {
      const { source, qrId } = classifyPlaceLinkSource({
        searchParams: params,
        referrer: document.referrer,
      })
      rememberPlaceLinkSource(session, placeId, source, qrId)
    }
    const stripped = stripPlaceTrackingParams(window.location.href)
    if (stripped) {
      window.history.replaceState(null, '', stripped)
    }
  }, [placeId])

  useEffect(() => {
    if (!joined || countedRef.current || !isPublicPlaceIdValid(placeId)) {
      return
    }
    if (navigator.webdriver) {
      return
    }
    countedRef.current = true
    let session: Storage | null = null
    try {
      session = window.sessionStorage
    } catch {
      // storage unavailable
    }
    const dedupeKey = `nessa:place-chat-join:${placeId}`
    try {
      if (session?.getItem(dedupeKey)) {
        return
      }
      session?.setItem(dedupeKey, '1')
    } catch {
      // count anyway
    }
    const remembered = recallPlaceLinkSource(session, placeId)
    recordPlaceLinkVisit({
      placeId,
      event: 'chat_join',
      source: remembered?.source ?? 'direct',
      qrId: remembered?.qrId ?? null,
    }).catch(() => undefined)
  }, [joined, placeId])

  return null
}
