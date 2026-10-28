/**
 * Server-side Place directory: one Cloud Function call per cache window,
 * shared by the home page, /places and the sitemap. Key-bearing photo URLs
 * are removed so they never end up in cached HTML (the browser fetches its
 * own copy for photos — see place-directory-client.ts).
 */

import { unstable_cache } from 'next/cache'

import { parseDirectoryPlace, stripKeyedPhoto, type DirectoryData } from '@/lib/place-directory'

const REVALIDATE_SECONDS = 600
const TIMEOUT_MS = 15000

function callableUrl(): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
  if (!projectId) return null
  const emulator = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST?.trim()
  return emulator
    ? `http://${emulator}/${projectId}/us-central1/getPublicPlaceDirectory`
    : `https://us-central1-${projectId}.cloudfunctions.net/getPublicPlaceDirectory`
}

async function fetchDirectory(): Promise<DirectoryData> {
  const url = callableUrl()
  if (!url) throw new Error('directory: project not configured')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const key = process.env.NESSA_WEB_SSR_KEY?.trim()
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'x-nessa-ssr-key': key } : {}) },
      body: JSON.stringify({ data: {} }),
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`directory: HTTP ${res.status}`)
    const body = (await res.json()) as { result?: { places?: unknown[]; generatedAt?: number } }
    const raw = Array.isArray(body.result?.places) ? body.result!.places! : null
    if (!raw) throw new Error('directory: bad payload')
    const places = raw.map(parseDirectoryPlace).filter((p): p is NonNullable<typeof p> => p !== null).map(stripKeyedPhoto)
    return { places, total: places.length, generatedAt: body.result?.generatedAt ?? Date.now() }
  } finally {
    clearTimeout(timer)
  }
}

/** Two attempts: the first call after a deploy can hit a cold function. */
async function fetchDirectoryWithRetry(): Promise<DirectoryData> {
  try {
    return await fetchDirectory()
  } catch {
    await new Promise(r => setTimeout(r, 1500))
    return fetchDirectory()
  }
}

const cached = unstable_cache(fetchDirectoryWithRetry, ['public-place-directory-v1'], { revalidate: REVALIDATE_SECONDS })

const isBuild = () => process.env.NEXT_PHASE === 'phase-production-build'

/**
 * During `next build` an outage must not fail the deploy: the pages render
 * without the list (the browser then loads it, see PlacesBrowser). At
 * runtime (ISR regeneration) the error is re-thrown so Next keeps serving
 * the last good page instead of caching an empty one.
 */
export async function getPlaceDirectory(): Promise<DirectoryData | null> {
  try {
    return await cached()
  } catch (e) {
    if (isBuild()) return null
    throw e
  }
}
