'use client'

/**
 * Public Wi-Fi on the Place page. Passwords never go into the server HTML
 * (crawlers, caches), so the browser loads them — and only for Places that
 * have public Wi-Fi (`hasWifi`). Both placements (phones above the content,
 * desktop in the sidebar) share one request.
 */

import { useEffect, useState } from 'react'

import { PlaceWifiCard } from '@/components/place/place-wifi-card'
import type { PublicPlaceWifi } from '@/lib/place-landing'
import { fetchPublicPlaceWifi } from '@/lib/place-public-api'

const requests = new Map<string, Promise<PublicPlaceWifi | null>>()

function loadWifi(placeId: string): Promise<PublicPlaceWifi | null> {
  let pending = requests.get(placeId)
  if (!pending) {
    pending = fetchPublicPlaceWifi(placeId).catch(() => {
      requests.delete(placeId)
      return null
    })
    requests.set(placeId, pending)
  }
  return pending
}

export function PlaceWifiSlot({ placeId, className }: { placeId: string; className?: string }) {
  const [wifi, setWifi] = useState<PublicPlaceWifi | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadWifi(placeId).then(w => {
      if (!cancelled) setWifi(w)
    })
    return () => {
      cancelled = true
    }
  }, [placeId])
  return wifi ? <PlaceWifiCard wifi={wifi} className={className} /> : null
}
