import {
  collection,
  doc,
  setDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { CHAT_SESSIONS_COLLECTION, SESSION_ABSOLUTE_MS } from '@/lib/chat/constants'

export function generateSessionId() {
  return nanoid(12)
}

export function sessionDocRef(db: Firestore, sessionId: string) {
  return doc(db, CHAT_SESSIONS_COLLECTION, sessionId)
}

export function messagesCollectionRef(db: Firestore, sessionId: string) {
  return collection(db, CHAT_SESSIONS_COLLECTION, sessionId, 'messages')
}

/**
 * New session fields. Caller must be signed in (anonymous ok).
 * `lastActivityAt` and `createdAt` use serverTimestamp in one set; `lastActivityAt` updates on each message send (rules), not used for session end (end is `expiresAt` only).
 */
export function buildNewSessionFields(args: {
  sessionId: string
  uid: string
  displayName: string
  language: string
}) {
  const { sessionId, uid, displayName, language } = args
  const expiresAt = Timestamp.fromMillis(Date.now() + SESSION_ABSOLUTE_MS)
  return {
    sessionId,
    status: 'active' as const,
    createdAt: serverTimestamp(),
    expiresAt,
    lastActivityAt: serverTimestamp(),
    members: {
      [uid]: {
        displayName,
        language,
        joinedAt: serverTimestamp(),
      },
    },
    createdById: uid,
    updatedAt: serverTimestamp(),
  }
}

export async function createChatSession(db: Firestore, uid: string, displayName: string, language: string) {
  const sessionId = generateSessionId()
  await setDoc(sessionDocRef(db, sessionId), buildNewSessionFields({ sessionId, uid, displayName, language }))
  return sessionId
}

/** Field-path merge join — does not replace entire `members` map (plan §3.4). */
export async function joinSessionMember(
  db: Firestore,
  sessionId: string,
  uid: string,
  displayName: string,
  language: string,
) {
  const ref = sessionDocRef(db, sessionId)
  await updateDoc(ref, {
    [`members.${uid}`]: {
      displayName,
      language,
      joinedAt: serverTimestamp(),
    },
  })
}

/** Atomic: new message + session `lastActivityAt` only (plan §5.1, §3.1). */
export async function sendChatMessage(db: Firestore, sessionId: string, uid: string, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  const batch = writeBatch(db)
  const sessionRef = sessionDocRef(db, sessionId)
  const msgRef = doc(collection(db, CHAT_SESSIONS_COLLECTION, sessionId, 'messages'))
  batch.set(msgRef, {
    senderId: uid,
    type: 'text' as const,
    text: trimmed,
    createdAt: serverTimestamp(),
  })
  batch.update(sessionRef, {
    lastActivityAt: serverTimestamp(),
  })
  await batch.commit()
}

/** Client-driven end room — `updatedAt` only on lifecycle (plan §3.1). */
export async function expireSessionAsUser(db: Firestore, sessionId: string) {
  const sessionRef = sessionDocRef(db, sessionId)
  await updateDoc(sessionRef, {
    status: 'expired' as const,
    updatedAt: serverTimestamp(),
  })
}
