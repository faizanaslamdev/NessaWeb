'use client'

/**
 * Public Wi-Fi on the Place page. Passwords never go into the server HTML
 * (crawlers, caches), so the browser loads them — and only for Places that
 * have public Wi-Fi (`hasWifi`). Both placements (phones above the content,
 * desktop in the sidebar) and the hero's Google photo share one request.
 */

import { useEffect, useState } from 'react'

import { PlaceWifiCard } from '@/components/place/place-wifi-card'
import type { PublicPlaceWifi } from '@/lib/place-landing'
import { loadPlaceBrowserExtras } from '@/lib/place-public-api'

export function PlaceWifiSlot({ placeId, className }: { placeId: string; className?: string }) {
  const [wifi, setWifi] = useState<PublicPlaceWifi | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadPlaceBrowserExtras(placeId).then(extras => {
      if (!cancelled) setWifi(extras.wifi)
    })
    return () => {
      cancelled = true
    }
  }, [placeId])
  return wifi ? <PlaceWifiCard wifi={wifi} className={className} /> : null
}
