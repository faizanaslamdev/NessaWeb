'use client'

/**
 * Browser fallback for the directory list (when the server render couldn't
 * load it). Card photos are NessaChat covers and come with the server HTML —
 * listings never load Google photos.
 */

import { useEffect, useState } from 'react'
import { parseDirectoryPlace, stripKeyedPhoto, type DirectoryPlace } from '@/lib/place-directory'
// Plain fetch of the callable: keeps the Firebase SDK out of the home page and /places.
import { callPublicFunction } from '@/lib/place-public-api'

type Loaded = { places: DirectoryPlace[] }
let inflight: Promise<Loaded> | null = null
let loaded: Loaded | null = null

/** One directory call per page load at most. */
function loadDirectory(): Promise<Loaded> {
  if (loaded) return Promise.resolve(loaded)
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await callPublicFunction<{ places?: unknown[] }>('getPublicPlaceDirectory', {})
      const places: DirectoryPlace[] = []
      for (const raw of res?.places ?? []) {
        const place = parseDirectoryPlace(raw)
        if (place) places.push(stripKeyedPhoto(place))
      }
      loaded = { places }
      return loaded
    } catch {
      return { places: [] }
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/**
 * The server-rendered list, or — when the server couldn't load it (outage
 * during a build) — the list loaded in the browser.
 */
export function useDirectoryPlaces(initial: DirectoryPlace[]): { places: DirectoryPlace[]; loading: boolean } {
  const [places, setPlaces] = useState(initial)
  const [loading, setLoading] = useState(initial.length === 0)
  useEffect(() => {
    if (initial.length) return
    let cancelled = false
    void loadDirectory().then(d => {
      if (cancelled) return
      setPlaces(d.places)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [initial])
  return { places, loading }
}
