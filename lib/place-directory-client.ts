'use client'

/**
 * Browser side of the Place directory.
 *
 * - Card photos: NessaChat covers come with the server HTML. For Places
 *   without one, Google's photo is the fallback. Those URLs carry the Maps key
 *   and every image load is a billed Google request, so: the list of fallback
 *   URLs is fetched once per tab (cached for 10 minutes in sessionStorage),
 *   and each card loads its image only when it scrolls into view.
 * - The directory list itself, when the server render couldn't load it.
 */

import { useEffect, useState, useSyncExternalStore } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

import { getFirebaseClient } from '@/lib/firebase'
import {
  parseDirectoryPlace,
  parseGooglePhotos,
  stripKeyedPhoto,
  type DirectoryPlace,
  type GoogleListingPhoto,
} from '@/lib/place-directory'

const STORAGE_KEY = 'nessa.directory.googlePhotos.v1'
const TTL_MS = 10 * 60 * 1000

type Loaded = { places: DirectoryPlace[]; googlePhotos: Record<string, GoogleListingPhoto> }
let inflight: Promise<Loaded> | null = null
let loaded: Loaded | null = null

function readStoredPhotos(): Record<string, GoogleListingPhoto> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; photos: unknown }
    return Date.now() - parsed.at < TTL_MS ? parseGooglePhotos(parsed.photos) : null
  } catch {
    return null
  }
}

/** One directory call per page load at most (shared by photos and the list fallback). */
function loadDirectory(): Promise<Loaded> {
  if (loaded) return Promise.resolve(loaded)
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const { app } = getFirebaseClient()
      const call = httpsCallable<{ googlePhotos: true }, { places?: unknown[]; googlePhotos?: unknown }>(
        getFunctions(app),
        'getPublicPlaceDirectory',
      )
      const res = await call({ googlePhotos: true })
      const places: DirectoryPlace[] = []
      for (const raw of res.data?.places ?? []) {
        const place = parseDirectoryPlace(raw)
        if (place) places.push(stripKeyedPhoto(place))
      }
      const googlePhotos = parseGooglePhotos(res.data?.googlePhotos)
      loaded = { places, googlePhotos }
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), photos: googlePhotos }))
      } catch {
        // storage full / private mode
      }
      return loaded
    } catch {
      return { places: [], googlePhotos: {} }
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/* One shared map of Google fallback photos for every card on the page. */
let googlePhotos: Record<string, GoogleListingPhoto> = {}
let requested = false
const listeners = new Set<() => void>()
function requestGooglePhotos() {
  if (requested) return
  requested = true
  const stored = readStoredPhotos()
  if (stored) {
    googlePhotos = stored
    queueMicrotask(() => listeners.forEach(l => l()))
    return
  }
  void loadDirectory().then(d => {
    googlePhotos = d.googlePhotos
    listeners.forEach(l => l())
  })
}
function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Google's photo for a Place without a NessaChat photo, or null. Pass
 * `enabled: false` until the card is near the viewport so off-screen cards
 * never trigger the lookup.
 */
export function useGoogleListingPhoto(placeId: string, enabled: boolean): GoogleListingPhoto | null {
  useEffect(() => {
    if (enabled) requestGooglePhotos()
  }, [enabled])
  return useSyncExternalStore(
    subscribe,
    () => (enabled ? (googlePhotos[placeId] ?? null) : null),
    () => null,
  )
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
