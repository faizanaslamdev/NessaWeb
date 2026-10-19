'use client'

import { useEffect } from 'react'

import { isPublicPlaceIdValid, recordPlaceLinkVisit } from '@/lib/place-landing'
import {
  classifyPlaceLinkSource,
  markPlaceSeen,
  rememberPlaceLinkSource,
  stripPlaceTrackingParams,
} from '@/lib/place-link-source'

/**
 * True when this page was reached by client-side (in-app) navigation rather
 * than a fresh document load — `document.referrer` is stale in that case.
 */
function isClientSideNavigation(): boolean {
  try {
    const entry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    if (!entry?.name) {
      return false
    }
    return new URL(entry.name).pathname !== window.location.pathname
  } catch {
    return false
  }
}

/**
 * Attributes one visit to its source (QR / Instagram / website / search /
 * Nessa app / pre-arrival / nessachat.com / other / direct) and to new vs
 * returning (a per-browser flag, no identity), remembers the source for
 * this tab so a later Place Chat join is credited to it, then strips the
 * tracking params from the address bar so copied links stay clean and
 * canonical. Renders nothing; never blocks or breaks the page.
 */
export function PlaceVisitTracker({ placeId }: { placeId: string }) {
  useEffect(() => {
    if (!isPublicPlaceIdValid(placeId)) {
      return
    }
    const searchParams = new URLSearchParams(window.location.search)
    const internal = isClientSideNavigation()
    const { source, qrId } = classifyPlaceLinkSource({
      searchParams,
      referrer: internal ? window.location.href : document.referrer,
    })

    const stripped = stripPlaceTrackingParams(window.location.href)
    if (stripped) {
      window.history.replaceState(null, '', stripped)
    }

    let session: Storage | null = null
    let local: Storage | null = null
    try {
      session = window.sessionStorage
      local = window.localStorage
    } catch {
      // storage unavailable (private mode / blocked)
    }
    rememberPlaceLinkSource(session, placeId, source, qrId)

    if (navigator.webdriver) {
      return
    }
    // One count per Place per browser tab session (refresh-safe; a reload's
    // referrer can differ, so the source isn't part of the key).
    const dedupeKey = `nessa:place-visit:${placeId}`
    try {
      if (session?.getItem(dedupeKey)) {
        return
      }
      session?.setItem(dedupeKey, '1')
    } catch {
      // Storage unavailable (private mode) — count anyway.
    }
    const visitor = markPlaceSeen(local, placeId)
    recordPlaceLinkVisit({ placeId, source, qrId, visitor }).catch(() => undefined)
  }, [placeId])

  return null
}
