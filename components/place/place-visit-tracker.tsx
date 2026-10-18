'use client'

import { useEffect } from 'react'

import { isPublicPlaceIdValid, recordPlaceLinkVisit } from '@/lib/place-landing'
import {
  classifyPlaceLinkSource,
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
 * Nessa app / nessachat.com / other / direct), then strips the tracking
 * params from the address bar so copied links stay clean and canonical.
 * Renders nothing; never blocks or breaks the page.
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

    if (navigator.webdriver) {
      return
    }
    // One count per Place per browser tab session (refresh-safe; a reload's
    // referrer can differ, so the source isn't part of the key).
    const dedupeKey = `nessa:place-visit:${placeId}`
    try {
      if (window.sessionStorage.getItem(dedupeKey)) {
        return
      }
      window.sessionStorage.setItem(dedupeKey, '1')
    } catch {
      // Storage unavailable (private mode) — count anyway.
    }
    recordPlaceLinkVisit({ placeId, source, qrId }).catch(() => undefined)
  }, [placeId])

  return null
}
