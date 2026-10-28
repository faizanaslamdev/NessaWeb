'use client'

/**
 * NessaChat photo library — browser side.
 *
 * Uploads: the browser resizes and re-encodes each image as JPEG (which also
 * drops EXIF / GPS), uploads it to the caller's own Storage folder
 * (`users/{uid}/photo-uploads/{uploadId}/`), then the `managePlacePhotos` callable checks
 * permissions, validates the files and publishes them under `places/` or
 * `businesses/`. Clients can never write the published folders directly.
 */

import { getFunctions, httpsCallable } from 'firebase/functions'
import { connectStorageEmulator, getStorage, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage'

import { getFirebaseClient } from '@/lib/firebase'

export type PlacePhotoSource = 'business' | 'admin' | 'community' | 'story'

export type ManagedPlacePhoto = {
  id: string
  source: PlacePhotoSource
  status: 'active' | 'hidden'
  url: string
  feedUrl?: string
  width?: number
  height?: number
  creditName?: string
  caption?: string
  createdAt?: number
  canRemove: boolean
}

export type PlaceCover = {
  photoId: string
  url: string
  feedUrl?: string
  source: PlacePhotoSource
  creditName?: string
  pickedBy?: 'business' | 'admin'
}

export type PlacePhotoLibrary = {
  photos: ManagedPlacePhoto[]
  cover: PlaceCover | null
  coverPick: { businessPhotoId?: string; adminPhotoId?: string }
  logoUrl: string | null
  hasBusiness: boolean
  authorizedBy: 'admin' | 'business'
  canModerate: boolean
  maxUploads: number
}

/** Who the caller acts as: the Place's business, or Nessa (admin console). */
export type PhotoActor = 'business' | 'admin'

export class PlacePhotoError extends Error {}

const MESSAGES: Record<string, string> = {
  unauthenticated: 'Sign in with a verified email to manage photos.',
  'permission-denied': 'You don’t have permission to do that.',
  'resource-exhausted': 'Too many changes in a short time. Please try again later.',
  'not-found': 'That photo no longer exists. Refresh and try again.',
}

function toError(err: unknown, fallback: string): PlacePhotoError {
  if (err instanceof PlacePhotoError) return err
  const code = String((err as { code?: string })?.code ?? '').replace(/^functions\//, '')
  const raw = typeof (err as { message?: string })?.message === 'string' ? (err as { message: string }).message : ''
  if (code === 'invalid-argument' && raw) return new PlacePhotoError(raw)
  if (code === 'permission-denied' && raw && !/^permission/i.test(raw)) return new PlacePhotoError(raw)
  return new PlacePhotoError(MESSAGES[code] ?? fallback)
}

async function call<T>(data: Record<string, unknown>, fallback: string): Promise<T> {
  try {
    const { app } = getFirebaseClient()
    const fn = httpsCallable<Record<string, unknown>, T>(getFunctions(app), 'managePlacePhotos')
    return (await fn(data)).data
  } catch (err) {
    throw toError(err, fallback)
  }
}

const asField = (actor: PhotoActor) => (actor === 'business' ? { as: 'business' } : {})

export function listPlacePhotos(placeId: string, actor: PhotoActor): Promise<PlacePhotoLibrary> {
  return call({ action: 'list', placeId, ...asField(actor) }, 'Could not load photos.')
}

export function setPlaceCover(placeId: string, photoId: string, actor: PhotoActor) {
  return call<{ cover: PlaceCover | null }>({ action: 'setCover', placeId, photoId, ...asField(actor) }, 'Could not change the cover.')
}

export function clearPlaceCover(placeId: string, actor: PhotoActor) {
  return call<{ cover: PlaceCover | null }>({ action: 'clearCover', placeId, ...asField(actor) }, 'Could not change the cover.')
}

export function removePlacePhoto(placeId: string, photoId: string, actor: PhotoActor) {
  return call<{ cover: PlaceCover | null }>({ action: 'remove', placeId, photoId, ...asField(actor) }, 'Could not remove the photo.')
}

/** Admin only. */
export function setPlacePhotoHidden(placeId: string, photoId: string, hidden: boolean) {
  return call<{ cover: PlaceCover | null }>(
    { action: hidden ? 'hide' : 'unhide', placeId, photoId },
    hidden ? 'Could not hide the photo.' : 'Could not restore the photo.',
  )
}

export function removeBusinessLogo(placeId: string, actor: PhotoActor) {
  return call<{ logoUrl: null }>({ action: 'removeLogo', placeId, ...asField(actor) }, 'Could not remove the logo.')
}

/** Super Admin: mirror existing public story photos into Place libraries (paged). */
export async function backfillStoryPhotos(onPage?: (scanned: number) => void): Promise<{ scanned: number; places: number }> {
  let cursor: string | null = null
  let scanned = 0
  let places = 0
  for (let i = 0; i < 200; i++) {
    const page: { scanned: number; placesUpdated: number; nextCursor: string | null; done: boolean } = await call(
      { action: 'backfillStories', cursor },
      'Could not import story photos.',
    )
    scanned += page.scanned
    places += page.placesUpdated
    onPage?.(scanned)
    if (page.done || !page.nextCursor) break
    cursor = page.nextCursor
  }
  return { scanned, places }
}

// ---------------------------------------------------------------------------
// Image preparation + upload
// ---------------------------------------------------------------------------

export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_INPUT_BYTES = 25 * 1024 * 1024

let storage: FirebaseStorage | null = null
function storageClient(): FirebaseStorage {
  if (storage) return storage
  const { app } = getFirebaseClient()
  const bucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${app.options.projectId ?? 'nessa-86e2f'}.firebasestorage.app`
  storage = getStorage(app, `gs://${bucket}`)
  const emulator = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST
  if (emulator) {
    const [host, port] = emulator.split(':')
    connectStorageEmulator(storage, host || '127.0.0.1', Number(port) || 9199)
  }
  return storage
}

type Prepared = { blob: Blob; width: number; height: number }

/** Pure: target size that fits `maxEdge` (never upscales). */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

async function decode(file: File): Promise<ImageBitmap> {
  if (!PHOTO_ACCEPT.split(',').includes(file.type)) {
    throw new PlacePhotoError('Please choose a JPEG, PNG or WebP image.')
  }
  if (file.size > MAX_INPUT_BYTES) throw new PlacePhotoError('That image is larger than 25 MB.')
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new PlacePhotoError('We couldn’t read that image. Try another file.')
  }
}

function encode(bitmap: ImageBitmap, maxEdge: number, quality: number, square = false): Promise<Prepared> {
  let sx = 0
  let sy = 0
  let sw = bitmap.width
  let sh = bitmap.height
  if (square) {
    const side = Math.min(sw, sh)
    sx = Math.round((sw - side) / 2)
    sy = Math.round((sh - side) / 2)
    sw = side
    sh = side
  }
  const { width, height } = fitWithin(sw, sh, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PlacePhotoError('Your browser can’t prepare this image.')
  ctx.fillStyle = '#ffffff' // transparent PNGs → white, not black
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      blob => (blob ? resolve({ blob, width, height }) : reject(new PlacePhotoError('Could not prepare the image.'))),
      'image/jpeg',
      quality,
    ),
  )
}

function newUploadId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

async function stage(uploadId: string, name: string, blob: Blob) {
  const { auth } = getFirebaseClient()
  const uid = auth.currentUser?.uid
  if (!uid) throw new PlacePhotoError(MESSAGES.unauthenticated)
  try {
    await uploadBytes(ref(storageClient(), `users/${uid}/photo-uploads/${uploadId}/${name}`), blob, {
      contentType: 'image/jpeg',
    })
  } catch {
    throw new PlacePhotoError('Upload failed. Check your connection and try again.')
  }
}

/** Resize (1600 px + 720 px card variant), upload, and add to the Place's photos. */
export async function uploadPlacePhoto(input: {
  placeId: string
  file: File
  actor: PhotoActor
  caption?: string
  makeCover?: boolean
}): Promise<{ photo: ManagedPlacePhoto; cover: PlaceCover | null }> {
  const bitmap = await decode(input.file)
  try {
    if (Math.min(bitmap.width, bitmap.height) < 320) {
      throw new PlacePhotoError('That image is too small. Use one at least 320 pixels on each side.')
    }
    const master = await encode(bitmap, 1600, 0.85)
    const feed = await encode(bitmap, 720, 0.8)
    const uploadId = newUploadId()
    await stage(uploadId, 'master.jpg', master.blob)
    await stage(uploadId, 'feed.jpg', feed.blob)
    return await call(
      {
        action: 'add',
        placeId: input.placeId,
        uploadId,
        width: master.width,
        height: master.height,
        ...(input.caption?.trim() ? { caption: input.caption.trim() } : {}),
        ...(input.makeCover ? { makeCover: true } : {}),
        ...asField(input.actor),
      },
      'Could not add the photo.',
    )
  } finally {
    bitmap.close()
  }
}

/** Square-crop to 512 px and set as the business logo. */
export async function uploadBusinessLogo(input: { placeId: string; file: File; actor: PhotoActor }): Promise<{ logoUrl: string }> {
  const bitmap = await decode(input.file)
  try {
    const logo = await encode(bitmap, 512, 0.9, true)
    const uploadId = newUploadId()
    await stage(uploadId, 'logo.jpg', logo.blob)
    return await call({ action: 'setLogo', placeId: input.placeId, uploadId, ...asField(input.actor) }, 'Could not update the logo.')
  } finally {
    bitmap.close()
  }
}
