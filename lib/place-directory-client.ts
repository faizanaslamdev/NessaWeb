'use client'

/**
 * Browser fallback for the directory list (when the server render couldn't
 * load it). Card photos are NessaChat covers and come with the server HTML —
 * listings never load Google photos.
 */

import { useEffect, useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

import { getFirebaseClient } from '@/lib/firebase'
import { parseDirectoryPlace, stripKeyedPhoto, type DirectoryPlace } from '@/lib/place-directory'

type Loaded = { places: DirectoryPlace[] }
let inflight: Promise<Loaded> | null = null
let loaded: Loaded | null = null

/** One directory call per page load at most. */
function loadDirectory(): Promise<Loaded> {
  if (loaded) return Promise.resolve(loaded)
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const { app } = getFirebaseClient()
      const call = httpsCallable<Record<string, never>, { places?: unknown[] }>(getFunctions(app), 'getPublicPlaceDirectory')
      const res = await call({})
      const places: DirectoryPlace[] = []
      for (const raw of res.data?.places ?? []) {
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
