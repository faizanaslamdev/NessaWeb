'use client'

/**
 * Business messaging — Firestore listeners (reads under firestore.rules) and
 * the business-messaging callables (every write), for both sides: the staff
 * Inbox and the traveler's /messages. Errors from callables are rethrown
 * as-is; describeMessagingError() turns them into plain language.
 */

import {
  collection,
  doc,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

import {
  MESSAGES_PAGE,
  parseMessage,
  parseThread,
  type BusinessMessage,
  type BusinessThread,
  type SenderRole,
  type ThreadQuerySpec,
  type ThreadStatus,
} from '@/lib/business-messaging'
import { deferredFirestoreSubscribe } from '@/lib/deferred-firestore-subscribe'
import { getFirebaseClient } from '@/lib/firebase'

const THREADS = 'business_threads'
const MESSAGES = 'messages'

export function subscribeThreads(
  spec: ThreadQuerySpec,
  onData: (threads: BusinessThread[], rawCount: number) => void,
  onError: (err: unknown) => void,
): () => void {
  return deferredFirestoreSubscribe(() => {
    const { firestore } = getFirebaseClient()
    const constraints: QueryConstraint[] = spec.where.map(([field, op, value]) => where(field, op, value))
    constraints.push(orderBy(spec.orderBy[0], spec.orderBy[1]), limitTo(spec.limit))
    return onSnapshot(
      query(collection(firestore, THREADS), ...constraints),
      snap => onData(snap.docs.map(d => parseThread(d.id, d.data({ serverTimestamps: 'estimate' }))), snap.size),
      onError,
    )
  })
}

/**
 * One thread doc. Rules deny reading a thread that doesn't exist yet, so
 * only call this for a thread known to exist (listed, or just started).
 */
export function subscribeThread(
  threadId: string,
  onData: (thread: BusinessThread | null) => void,
  onError: (err: unknown) => void,
): () => void {
  return deferredFirestoreSubscribe(() => {
    const { firestore } = getFirebaseClient()
    return onSnapshot(
      doc(firestore, THREADS, threadId),
      snap => onData(snap.exists() ? parseThread(snap.id, snap.data({ serverTimestamps: 'estimate' })) : null),
      onError,
    )
  })
}

/** Newest `count` messages, delivered oldest first. */
export function subscribeThreadMessages(
  threadId: string,
  count: number,
  onData: (messages: BusinessMessage[], hasMore: boolean) => void,
  onError: (err: unknown) => void,
): () => void {
  const size = Math.max(1, count || MESSAGES_PAGE)
  return deferredFirestoreSubscribe(() => {
    const { firestore } = getFirebaseClient()
    return onSnapshot(
      query(collection(firestore, THREADS, threadId, MESSAGES), orderBy('createdAt', 'desc'), limitTo(size)),
      snap => {
        const list = snap.docs.map(d => parseMessage(d.id, d.data({ serverTimestamps: 'estimate' })))
        list.reverse()
        onData(list, snap.size >= size)
      },
      onError,
    )
  })
}

/**
 * Whether a business accepts new traveler messages (`messagingEnabled`,
 * absent = on), live — so the traveler's composer follows the owner's
 * switch both ways. businesses/{id} is readable by any signed-in user.
 * Reports true when it can't be read — the callables enforce it anyway.
 */
export function subscribeBusinessMessagingEnabled(businessId: string, onData: (enabled: boolean) => void): () => void {
  return deferredFirestoreSubscribe(() => {
    const { firestore } = getFirebaseClient()
    return onSnapshot(
      doc(firestore, 'businesses', businessId),
      snap => onData(snap.data()?.messagingEnabled !== false),
      () => onData(true),
    )
  })
}

/**
 * The user's own `users/{uid}/private/businessAccess` doc (server-written,
 * owner-readable). Reports `fromCache` so callers can wait for the server
 * before deciding the doc is missing.
 */
export function subscribeBusinessAccess(
  uid: string,
  onData: (snap: { exists: boolean; fromCache: boolean; data: unknown }) => void,
  onError: (err: unknown) => void,
): () => void {
  return deferredFirestoreSubscribe(() => {
    const { firestore } = getFirebaseClient()
    return onSnapshot(
      doc(firestore, 'users', uid, 'private', 'businessAccess'),
      { includeMetadataChanges: true },
      snap => onData({ exists: snap.exists(), fromCache: snap.metadata.fromCache, data: snap.data() }),
      onError,
    )
  })
}

/** Creates the caller's businessAccess doc when it doesn't exist yet (accounts from before it). */
export async function syncMyBusinessAccess(): Promise<void> {
  await callable<Record<string, never>, unknown>('syncMyBusinessAccess')({})
}

function callable<Req, Res>(name: string) {
  const { app } = getFirebaseClient()
  return httpsCallable<Req, Res>(getFunctions(app), name)
}

/** Traveler: first message to the business behind a Place (creates or continues their thread). */
export async function startBusinessThread(input: {
  placeId: string
  text: string
  clientId: string
}): Promise<{ ok: true; threadId: string; messageId: string; created: boolean; duplicate: boolean }> {
  const res = await callable<typeof input, Awaited<ReturnType<typeof startBusinessThread>>>('startBusinessThread')(input)
  return res.data
}

export async function sendBusinessMessage(input: {
  threadId: string
  text: string
  clientId: string
}): Promise<{ ok: true; threadId: string; messageId: string; senderRole: SenderRole; duplicate: boolean }> {
  const res = await callable<typeof input, Awaited<ReturnType<typeof sendBusinessMessage>>>('sendBusinessMessage')(input)
  return res.data
}

export async function markBusinessThreadRead(threadId: string): Promise<{ changed: boolean }> {
  const res = await callable<{ threadId: string }, { ok: true; changed: boolean }>('markBusinessThreadRead')({ threadId })
  return { changed: res.data.changed }
}

export type StaffThreadAction = 'archive' | 'unarchive' | 'block' | 'unblock' | 'report'
export type CustomerThreadAction = 'hide' | 'report' | 'block' | 'unblock'

export async function manageBusinessThread(input: {
  threadId: string
  action: StaffThreadAction | CustomerThreadAction
  reason?: string
}): Promise<{ status: ThreadStatus; changed: boolean; reportId?: string }> {
  const res = await callable<
    typeof input,
    { ok: true; status: ThreadStatus; changed: boolean; reportId?: string }
  >('manageBusinessThread')(input)
  return { status: res.data.status, changed: res.data.changed, reportId: res.data.reportId }
}
