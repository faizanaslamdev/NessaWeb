/**
 * Server-side Place directory: one Cloud Function call per cache window,
 * shared by the home page, /places and the sitemap. Key-bearing photo URLs
 * are removed so they never end up in cached HTML (the browser fetches its
 * own copy for photos — see place-directory-client.ts).
 */

import { unstable_cache } from 'next/cache'

import { parseDirectoryPlace, stripKeyedPhoto, type DirectoryData } from '@/lib/place-directory'

const REVALIDATE_SECONDS = 600
const TIMEOUT_MS = 8000

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

const cached = unstable_cache(fetchDirectory, ['public-place-directory-v1'], { revalidate: REVALIDATE_SECONDS })

/** Never throws: an outage renders the pages without the list (not cached). */
export async function getPlaceDirectory(): Promise<DirectoryData | null> {
  try {
    return await cached()
  } catch {
    return null
  }
}
