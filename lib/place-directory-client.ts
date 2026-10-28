'use client'

/**
 * Browser-side photos for directory cards. Google photo URLs carry the public
 * Maps key, so server HTML never includes them; the page asks the directory
 * callable once per tab session and fills the photos in.
 */

import { useEffect, useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

import { getFirebaseClient } from '@/lib/firebase'
import { parseDirectoryPlace, stripKeyedPhoto, type DirectoryPlace } from '@/lib/place-directory'

const STORAGE_KEY = 'nessa.directory.photos.v1'
const TTL_MS = 10 * 60 * 1000

function readStored(): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; photos: Record<string, string> }
    return Date.now() - parsed.at < TTL_MS ? parsed.photos : null
  } catch {
    return null
  }
}

type Loaded = { places: DirectoryPlace[]; photos: Record<string, string> }
let inflight: Promise<Loaded> | null = null
let loaded: Loaded | null = null

/** One directory call per page load, shared by photos and the list fallback. */
function loadDirectory(): Promise<Loaded> {
  if (loaded) return Promise.resolve(loaded)
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const { app } = getFirebaseClient()
      const call = httpsCallable<Record<string, never>, { places?: unknown[] }>(getFunctions(app), 'getPublicPlaceDirectory')
      const res = await call({})
      const photos: Record<string, string> = {}
      const places: DirectoryPlace[] = []
      for (const raw of res.data?.places ?? []) {
        const place = parseDirectoryPlace(raw)
        if (!place) continue
        if (place.photoUrl) photos[place.placeId] = place.photoUrl
        places.push(stripKeyedPhoto(place))
      }
      loaded = { places, photos }
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), photos }))
      } catch {
        // storage full / private mode
      }
      return loaded
    } catch {
      return { places: [], photos: {} }
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** placeId → photo URL. Empty on any error (cards keep their placeholder). */
export function loadDirectoryPhotos(): Promise<Record<string, string>> {
  const stored = readStored()
  if (stored) return Promise.resolve(stored)
  return loadDirectory().then(d => d.photos)
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

/** Same Google size rewrite the Place page uses (small cards). */
export function cardPhotoUrl(url: string, px = 480): string {
  try {
    const u = new URL(url)
    if (u.searchParams.has('maxWidthPx') || u.searchParams.has('maxHeightPx')) {
      u.searchParams.set('maxWidthPx', String(px))
      u.searchParams.set('maxHeightPx', String(px))
    }
    return u.toString()
  } catch {
    return url
  }
}
