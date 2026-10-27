/**
 * Server-only reads of public Place slugs (`place_slugs/{slug}`) via the
 * Firestore REST API, unauthenticated. Firestore rules make single slug docs
 * publicly readable and allow listing canonical ones, so the web server can
 * resolve slugs without a Cloud Function hop (and without sharing the
 * callable rate-limit buckets with visitors).
 *
 * Resolution is always slug → placeId → that Place's current canonical slug,
 * so retired slugs (after a rename) still land on the right page.
 */

import { unstable_cache } from 'next/cache'

import { isPublicPlaceIdValid } from '@/lib/place-landing'
import { isValidPlaceSlug } from '@/lib/place-slug'

const FIRESTORE_TIMEOUT_MS = 5000
const SLUG_CACHE_SECONDS = 300
const SITEMAP_PAGE_SIZE = 500
const SITEMAP_MAX_PAGES = 20

type FirestoreValue = {
  stringValue?: string
  booleanValue?: boolean
  timestampValue?: string
}

type FirestoreDocument = {
  name: string
  fields?: Record<string, FirestoreValue>
  updateTime?: string
}

export type PlaceSlugRecord = {
  slug: string
  placeId: string
  canonical: boolean
  indexable: boolean
  updatedAt?: string
}

export type PlaceSlugResolution = {
  placeId: string
  /** The Place's current canonical slug (null if it can't be determined). */
  canonicalSlug: string | null
}

/** Thrown for transport/server errors so callers can fail open vs. 404. */
export class PlaceSlugLookupError extends Error {}

function documentsBase(): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
  if (!projectId) {
    return null
  }
  // Local development / verification against the Firestore emulator.
  const emulator = process.env.FIRESTORE_EMULATOR_HOST?.trim()
  const origin = emulator ? `http://${emulator}` : 'https://firestore.googleapis.com'
  return `${origin}/v1/projects/${projectId}/databases/(default)/documents`
}

function toRecord(doc: FirestoreDocument): PlaceSlugRecord | null {
  const f = doc.fields ?? {}
  const slug = f.slug?.stringValue ?? doc.name.split('/').pop() ?? ''
  const placeId = f.placeId?.stringValue ?? ''
  if (!isValidPlaceSlug(slug) || !isPublicPlaceIdValid(placeId)) {
    return null
  }
  return {
    slug,
    placeId,
    canonical: f.canonical?.booleanValue === true,
    indexable: f.indexable?.booleanValue === true,
    updatedAt: f.updatedAt?.timestampValue ?? doc.updateTime,
  }
}

async function firestoreFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FIRESTORE_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      signal: controller.signal,
      // unstable_cache owns TTLs.
      cache: 'no-store',
    })
  } catch (e) {
    throw new PlaceSlugLookupError(
      e instanceof Error ? e.message : 'firestore fetch failed',
    )
  } finally {
    clearTimeout(timer)
  }
}

async function getSlugRecord(slug: string): Promise<PlaceSlugRecord | null> {
  const base = documentsBase()
  if (!base) {
    throw new PlaceSlugLookupError('firebase project not configured')
  }
  const res = await firestoreFetch(`${base}/place_slugs/${encodeURIComponent(slug)}`)
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new PlaceSlugLookupError(`place_slugs get ${res.status}`)
  }
  return toRecord((await res.json()) as FirestoreDocument)
}

type StructuredFilter = {
  fieldFilter: {
    field: { fieldPath: string }
    op: 'EQUAL'
    value: FirestoreValue
  }
}

function eq(fieldPath: string, value: FirestoreValue): StructuredFilter {
  return { fieldFilter: { field: { fieldPath }, op: 'EQUAL', value } }
}

async function runSlugQuery(
  filters: StructuredFilter[],
  limit: number,
  startAfterName?: string,
): Promise<{ records: PlaceSlugRecord[]; rawCount: number; lastName?: string }> {
  const base = documentsBase()
  if (!base) {
    throw new PlaceSlugLookupError('firebase project not configured')
  }
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: 'place_slugs' }],
    where: { compositeFilter: { op: 'AND', filters } },
    orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
    limit,
  }
  if (startAfterName) {
    structuredQuery.startAt = {
      values: [{ referenceValue: startAfterName }],
      before: false,
    }
  }
  const res = await firestoreFetch(`${base}:runQuery`, {
    method: 'POST',
    body: JSON.stringify({ structuredQuery }),
  })
  if (!res.ok) {
    throw new PlaceSlugLookupError(`place_slugs query ${res.status}`)
  }
  const rows = (await res.json()) as { document?: FirestoreDocument }[]
  const records: PlaceSlugRecord[] = []
  let rawCount = 0
  let lastName: string | undefined
  for (const row of rows) {
    if (row.document) {
      rawCount += 1
      lastName = row.document.name
      const record = toRecord(row.document)
      if (record) {
        records.push(record)
      }
    }
  }
  return { records, rawCount, lastName }
}

async function getCanonicalSlugForPlaceIdUncached(
  placeId: string,
): Promise<string | null> {
  const { records } = await runSlugQuery(
    [eq('placeId', { stringValue: placeId }), eq('canonical', { booleanValue: true })],
    1,
  )
  return records[0]?.slug ?? null
}

async function resolvePlaceSlugUncached(
  slug: string,
): Promise<PlaceSlugResolution | null> {
  const record = await getSlugRecord(slug)
  if (!record) {
    return null
  }
  if (record.canonical) {
    return { placeId: record.placeId, canonicalSlug: record.slug }
  }
  // Retired slug (renamed): find the Place's current one.
  const current = await getCanonicalSlugForPlaceIdUncached(record.placeId)
  return { placeId: record.placeId, canonicalSlug: current }
}

/**
 * Cached slug resolution. Returns null for an unknown slug; throws
 * PlaceSlugLookupError if Firestore couldn't be reached.
 */
export async function resolvePlaceSlug(
  slug: string,
): Promise<PlaceSlugResolution | null> {
  if (!isValidPlaceSlug(slug)) {
    return null
  }
  const cached = unstable_cache(
    async () => {
      const resolved = await resolvePlaceSlugUncached(slug)
      if (!resolved) {
        // Misses aren't cached — a just-created slug should work right away.
        throw new Error('place-slug-miss')
      }
      return resolved
    },
    ['place-slug-resolve-v1', slug],
    { revalidate: SLUG_CACHE_SECONDS },
  )
  try {
    return await cached()
  } catch (e) {
    if (e instanceof Error && e.message === 'place-slug-miss') {
      return null
    }
    throw e
  }
}

/**
 * Current canonical slug for a Google Place ID (legacy `/place/{id}` URLs).
 * Fail-open: null on any error so the legacy page keeps rendering.
 */
export async function getCanonicalSlugForPlaceId(
  placeId: string,
): Promise<string | null> {
  if (!isPublicPlaceIdValid(placeId)) {
    return null
  }
  try {
    return await unstable_cache(
      async () => {
        const slug = await getCanonicalSlugForPlaceIdUncached(placeId)
        if (!slug) {
          throw new Error('place-id-slug-miss')
        }
        return slug
      },
      ['place-id-canonical-slug-v1', placeId],
      { revalidate: SLUG_CACHE_SECONDS },
    )()
  } catch {
    return null
  }
}

/** Canonical + indexable slugs for sitemap.xml (best effort). */
export async function listIndexablePlaceSlugs(): Promise<PlaceSlugRecord[]> {
  const out: PlaceSlugRecord[] = []
  const base = documentsBase()
  if (!base) {
    return out
  }
  let cursor: string | undefined
  for (let page = 0; page < SITEMAP_MAX_PAGES; page += 1) {
    const { records, rawCount, lastName } = await runSlugQuery(
      [eq('canonical', { booleanValue: true }), eq('indexable', { booleanValue: true })],
      SITEMAP_PAGE_SIZE,
      cursor,
    )
    out.push(...records)
    if (rawCount < SITEMAP_PAGE_SIZE || !lastName) {
      break
    }
    cursor = lastName
  }
  return out
}

const SITEMAP_CACHE_SECONDS = 3600

/** Cached for sitemap.xml; empty list (not an error) if Firestore is unreachable. */
export async function getCachedIndexablePlaceSlugs(): Promise<PlaceSlugRecord[]> {
  try {
    return await unstable_cache(
      async () => listIndexablePlaceSlugs(),
      ['place-sitemap-slugs-v1'],
      { revalidate: SITEMAP_CACHE_SECONDS },
    )()
  } catch {
    return []
  }
}
