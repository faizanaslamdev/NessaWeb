'use client'

/**
 * Google Maps business search for "find your business" (signed-in users).
 * Uses the app's `searchPlaces` callable (establishments, rate-limited per
 * user). Nothing is created until the user files a claim.
 */

import { getFunctions, httpsCallable } from 'firebase/functions'

import { getFirebaseClient } from '@/lib/firebase'

export type GooglePlaceResult = {
  googlePlaceId: string
  name: string
  city: string
  secondaryText?: string
}

export class GooglePlaceSearchError extends Error {}

/** One session token per search session (Google bills autocomplete per session). */
export function newSearchSessionToken(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

export async function searchGooglePlaces(query: string, sessionToken: string): Promise<GooglePlaceResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  try {
    const { app } = getFirebaseClient()
    const call = httpsCallable<
      { query: string; sessionToken: string; mode: 'establishment' },
      { results?: GooglePlaceResult[] }
    >(getFunctions(app), 'searchPlaces')
    const res = await call({ query: q.slice(0, 200), sessionToken, mode: 'establishment' })
    return (res.data?.results ?? []).filter(r => /^ChIJ[A-Za-z0-9_-]+$/.test(r.googlePlaceId) && r.name)
  } catch (e) {
    const code = (e as { code?: string })?.code ?? ''
    if (code.includes('resource-exhausted')) throw new GooglePlaceSearchError('Too many searches — please try again in a little while.')
    if (code.includes('unauthenticated')) throw new GooglePlaceSearchError('Sign in to search Google Maps.')
    throw new GooglePlaceSearchError('Search isn’t available right now. Please try again.')
  }
}
