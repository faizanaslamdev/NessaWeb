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
  PLACE_CHAT_VIEWER_ACTIVE_MS,
  PLACE_CHAT_VIEWER_PREFS_PAGE_SIZE,
  PLACE_CHAT_VIEWER_PREFS_SUBCOLLECTION,
  buildPlaceChatTitle,
  isGooglePlaceId,
  isPlaceChatMessageExpired,
} from '@/lib/place-chat/constants'
import { normalizePlaceChatLanguage } from '@/lib/place-chat/translation'
import {
  filterRecentPlaceChatViewers,
  mapPlaceChatViewerPrefDoc,
  type PlaceChatViewerPref,
} from '@/lib/place-chat/viewers'

export type PlaceChatMessage = {
  id: string
  senderId: string
  displayName: string
  avatarUrl?: string
  text: string
  createdAtMs: number
  translation?: string
  translationStatus?: 'pending' | 'completed' | 'failed'
  translationLanguage?: string
  sourceLanguage?: string
  translationsByUser?: Record<string, string>
  translationsByLanguage?: Record<string, string>
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

/** Late-join: backfill translationsByLanguage for already-loaded message IDs. */
export async function backfillPlaceChatTranslations(args: {
  placeId: string
  messageIds: string[]
  targetLanguage: string
}): Promise<void> {
  const placeId = args.placeId.trim()
  if (!isGooglePlaceId(placeId) || args.messageIds.length === 0) {
    return
  }
  const { app } = getFirebaseClient()
  const callable = httpsCallable(getFunctions(app), 'backfillPlaceChatTranslations')
  await callable({
    placeId,
    messageIds: args.messageIds.slice(0, 20),
    targetLanguage: normalizePlaceChatLanguage(args.targetLanguage),
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
        const translationsByUser =
          data.translationsByUser &&
          typeof data.translationsByUser === 'object' &&
          !Array.isArray(data.translationsByUser)
            ? (data.translationsByUser as Record<string, string>)
            : undefined
        const translationsByLanguage =
          data.translationsByLanguage &&
          typeof data.translationsByLanguage === 'object' &&
          !Array.isArray(data.translationsByLanguage)
            ? (data.translationsByLanguage as Record<string, string>)
            : undefined
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
          translation:
            typeof data.translation === 'string' ? data.translation : undefined,
          translationStatus:
            data.translationStatus === 'pending' ||
            data.translationStatus === 'completed' ||
            data.translationStatus === 'failed'
              ? data.translationStatus
              : undefined,
          translationLanguage:
            typeof data.translationLanguage === 'string'
              ? data.translationLanguage
              : undefined,
          sourceLanguage:
            typeof data.sourceLanguage === 'string'
              ? data.sourceLanguage
              : undefined,
          translationsByUser,
          translationsByLanguage,
        })
      }
      onUpdate(list.reverse())
    },
    err => onError?.(err as Error),
  )
}

/** Persist viewer language + displayName for translation fan-out and participants. */
export async function setPlaceChatViewerLanguage(
  db: Firestore,
  args: {
    placeId: string
    uid: string
    language: string
    displayName?: string | null
  },
): Promise<void> {
  const placeId = args.placeId.trim()
  if (!isGooglePlaceId(placeId) || !args.uid) {
    return
  }
  const language = normalizePlaceChatLanguage(args.language)
  const payload: Record<string, unknown> = {
    language,
    updatedAt: serverTimestamp(),
  }
  const name = args.displayName?.trim()
  if (name) {
    payload.displayName = name.slice(0, 79)
  }
  await setDoc(
    doc(
      db,
      PLACE_CHATS_COLLECTION,
      placeId,
      PLACE_CHAT_VIEWER_PREFS_SUBCOLLECTION,
      args.uid,
    ),
    payload,
    { merge: true },
  )
}

/** Recent active viewers (not followers) for participants UI. */
export function subscribePlaceChatViewers(
  db: Firestore,
  placeId: string,
  onUpdate: (viewers: PlaceChatViewerPref[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(
      db,
      PLACE_CHATS_COLLECTION,
      placeId.trim(),
      PLACE_CHAT_VIEWER_PREFS_SUBCOLLECTION,
    ),
    orderBy('updatedAt', 'desc'),
    limit(PLACE_CHAT_VIEWER_PREFS_PAGE_SIZE),
  )
  return onSnapshot(
    q,
    snap => {
      const nowMs = Date.now()
      const list: PlaceChatViewerPref[] = []
      for (const d of snap.docs) {
        const data = d.data()
        const updatedAtMs =
          data.updatedAt && typeof data.updatedAt.toMillis === 'function'
            ? data.updatedAt.toMillis()
            : null
        const mapped = mapPlaceChatViewerPrefDoc({
          uid: d.id,
          language: data.language,
          displayName: data.displayName,
          updatedAtMs,
        })
        if (mapped) list.push(mapped)
      }
      onUpdate(
        filterRecentPlaceChatViewers(list, nowMs, PLACE_CHAT_VIEWER_ACTIVE_MS),
      )
    },
    err => onError?.(err as Error),
  )
}
