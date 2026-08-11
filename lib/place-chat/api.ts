/**
 * Place Chat Firestore helpers for public web guests.
 * Sends go through `sendPlaceChatMessage` callable (rate-limited).
 */

import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

import { getFirebaseClient } from '@/lib/firebase'
import {
  PLACE_CHATS_COLLECTION,
  PLACE_CHAT_MESSAGES_SUBCOLLECTION,
  PLACE_CHAT_MESSAGE_PAGE_SIZE,
  PLACE_CHAT_MESSAGE_TEXT_MAX,
  PLACE_CHAT_SCHEMA_VERSION,
  buildPlaceChatTitle,
  isGooglePlaceId,
  isPlaceChatMessageExpired,
} from '@/lib/place-chat/constants'

export type PlaceChatMessage = {
  id: string
  senderId: string
  displayName: string
  avatarUrl?: string
  text: string
  createdAtMs: number
}

export function placeChatDocRef(db: Firestore, placeId: string) {
  return doc(db, PLACE_CHATS_COLLECTION, placeId.trim())
}

export function placeChatMessagesRef(db: Firestore, placeId: string) {
  return collection(
    db,
    PLACE_CHATS_COLLECTION,
    placeId.trim(),
    PLACE_CHAT_MESSAGES_SUBCOLLECTION,
  )
}

export async function ensurePlaceChatRoom(
  db: Firestore,
  args: { placeId: string; placeName?: string | null },
): Promise<{ placeId: string; title: string }> {
  const placeId = args.placeId.trim()
  if (!isGooglePlaceId(placeId)) {
    throw new Error('invalid_place_id')
  }
  const title = buildPlaceChatTitle(args.placeName)
  const ref = placeChatDocRef(db, placeId)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    const data = existing.data() as { title?: string }
    return {
      placeId,
      title:
        typeof data.title === 'string' && data.title.trim()
          ? data.title
          : title,
    }
  }
  try {
    await setDoc(ref, {
      placeId,
      title,
      status: 'active',
      schemaVersion: PLACE_CHAT_SCHEMA_VERSION,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (e: unknown) {
    // Concurrent create — treat as success.
    const code =
      e && typeof e === 'object' && 'code' in e
        ? String((e as { code?: string }).code)
        : ''
    if (!code.includes('already-exists') && !code.includes('permission-denied')) {
      // permission-denied can race after another client created; re-read.
      const again = await getDoc(ref)
      if (!again.exists()) {
        throw e
      }
    }
  }
  return { placeId, title }
}

export async function sendPlaceChatMessage(args: {
  placeId: string
  uid: string
  displayName: string
  text: string
  placeName?: string | null
}): Promise<void> {
  const placeId = args.placeId.trim()
  if (!isGooglePlaceId(placeId)) {
    throw new Error('invalid_place_id')
  }
  const trimmed = args.text.trim()
  if (!trimmed) {
    throw new Error('empty_message')
  }
  if (trimmed.length > PLACE_CHAT_MESSAGE_TEXT_MAX) {
    throw new Error('message_too_long')
  }
  const displayName = args.displayName.trim() || 'Traveler'
  void args.uid
  const { app } = getFirebaseClient()
  const callable = httpsCallable(getFunctions(app), 'sendPlaceChatMessage')
  await callable({
    placeId,
    text: trimmed,
    displayName,
    placeName: args.placeName ?? null,
  })
}

export function subscribePlaceChatMessages(
  db: Firestore,
  placeId: string,
  onUpdate: (messages: PlaceChatMessage[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    placeChatMessagesRef(db, placeId),
    orderBy('createdAt', 'desc'),
    limit(PLACE_CHAT_MESSAGE_PAGE_SIZE),
  )
  return onSnapshot(
    q,
    snap => {
      const nowMs = Date.now()
      const list: PlaceChatMessage[] = []
      for (const d of snap.docs) {
        const data = d.data()
        const expiresAtMs =
          data.expiresAt && typeof data.expiresAt.toMillis === 'function'
            ? data.expiresAt.toMillis()
            : null
        if (isPlaceChatMessageExpired(expiresAtMs, nowMs)) {
          continue
        }
        const text = typeof data.text === 'string' ? data.text : ''
        const senderId = typeof data.senderId === 'string' ? data.senderId : ''
        if (!text || !senderId) {
          continue
        }
        list.push({
          id: d.id,
          senderId,
          displayName:
            typeof data.displayName === 'string' && data.displayName.trim()
              ? data.displayName.trim()
              : 'Traveler',
          avatarUrl:
            typeof data.avatarUrl === 'string' &&
            data.avatarUrl.startsWith('https://')
              ? data.avatarUrl
              : undefined,
          text,
          createdAtMs:
            data.createdAt && typeof data.createdAt.toMillis === 'function'
              ? data.createdAt.toMillis()
              : nowMs,
        })
      }
      onUpdate(list.reverse())
    },
    err => onError?.(err as Error),
  )
}
