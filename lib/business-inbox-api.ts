'use client'

/**
 * Business Inbox — Firestore listeners (reads under firestore.rules) and the
 * business-messaging callables (every write). Errors from callables are
 * rethrown as-is; describeInboxError() turns them into plain language.
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
  INBOX_MESSAGES_PAGE,
  parseMessage,
  parseThread,
  type InboxMessage,
  type InboxQuerySpec,
  type InboxThread,
} from '@/lib/business-inbox'
import { deferredFirestoreSubscribe } from '@/lib/deferred-firestore-subscribe'
import { getFirebaseClient } from '@/lib/firebase'

const THREADS = 'business_threads'
const MESSAGES = 'messages'

export function subscribeInboxThreads(
  spec: InboxQuerySpec,
  onData: (threads: InboxThread[], rawCount: number) => void,
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

export function subscribeInboxThread(
  threadId: string,
  onData: (thread: InboxThread | null) => void,
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
export function subscribeInboxMessages(
  threadId: string,
  count: number,
  onData: (messages: InboxMessage[], hasMore: boolean) => void,
  onError: (err: unknown) => void,
): () => void {
  const size = Math.max(1, count || INBOX_MESSAGES_PAGE)
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

function callable<Req, Res>(name: string) {
  const { app } = getFirebaseClient()
  return httpsCallable<Req, Res>(getFunctions(app), name)
}

export async function sendBusinessMessage(input: {
  threadId: string
  text: string
  clientId: string
}): Promise<{ ok: true; threadId: string; messageId: string; senderRole: 'customer' | 'business'; duplicate: boolean }> {
  const res = await callable<typeof input, Awaited<ReturnType<typeof sendBusinessMessage>>>('sendBusinessMessage')(input)
  return res.data
}

export async function markBusinessThreadRead(threadId: string): Promise<{ changed: boolean }> {
  const res = await callable<{ threadId: string }, { ok: true; changed: boolean }>('markBusinessThreadRead')({ threadId })
  return { changed: res.data.changed }
}

export type StaffThreadAction = 'archive' | 'unarchive' | 'block' | 'unblock' | 'report'

export async function manageBusinessThread(input: {
  threadId: string
  action: StaffThreadAction
  reason?: string
}): Promise<{ status: 'open' | 'archived' | 'blocked'; changed: boolean; reportId?: string }> {
  const res = await callable<
    typeof input,
    { ok: true; status: 'open' | 'archived' | 'blocked'; changed: boolean; reportId?: string }
  >('manageBusinessThread')(input)
  return { status: res.data.status, changed: res.data.changed, reportId: res.data.reportId }
}
