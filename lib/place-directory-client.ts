'use client'

/**
 * Browser-side photos for directory cards. Google photo URLs carry the public
 * Maps key, so server HTML never includes them; the page asks the directory
 * callable once per tab session and fills the photos in.
 */

import { getFunctions, httpsCallable } from 'firebase/functions'

import { getFirebaseClient } from '@/lib/firebase'
import { parseDirectoryPlace } from '@/lib/place-directory'

const STORAGE_KEY = 'nessa.directory.photos.v1'
const TTL_MS = 10 * 60 * 1000

let inflight: Promise<Record<string, string>> | null = null

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

/** placeId → photo URL. Empty on any error (cards keep their placeholder). */
export function loadDirectoryPhotos(): Promise<Record<string, string>> {
  const stored = readStored()
  if (stored) return Promise.resolve(stored)
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const { app } = getFirebaseClient()
      const call = httpsCallable<Record<string, never>, { places?: unknown[] }>(getFunctions(app), 'getPublicPlaceDirectory')
      const res = await call({})
      const photos: Record<string, string> = {}
      for (const raw of res.data?.places ?? []) {
        const place = parseDirectoryPlace(raw)
        if (place?.photoUrl) photos[place.placeId] = place.photoUrl
      }
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), photos }))
      } catch {
        // storage full / private mode
      }
      return photos
    } catch {
      return {}
    } finally {
      inflight = null
    }
  })()
  return inflight
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
