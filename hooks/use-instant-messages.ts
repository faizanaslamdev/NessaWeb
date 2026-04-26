'use client'

import { useEffect, useState } from 'react'
import {
  query,
  orderBy,
  limit,
  onSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore'
import { getFirebaseClient } from '@/lib/firebase'
import { messagesCollectionRef } from '@/lib/chat/session'
import type { ChatMessage, ChatMessageTranslationStatus } from '@/lib/chat/types'
import type { Timestamp } from 'firebase/firestore'

const PAGE = 200

function mapMessages(snap: QuerySnapshot): ChatMessage[] {
  return snap.docs.map((d) => {
    const x = d.data()
    const ts = x.translationStatus
    const translationStatus: ChatMessageTranslationStatus | undefined =
      ts === 'pending' || ts === 'completed' || ts === 'failed' ? ts : undefined
    const translationsByUser =
      x.translationsByUser && typeof x.translationsByUser === 'object' && !Array.isArray(x.translationsByUser)
        ? (x.translationsByUser as Record<string, string>)
        : undefined
    return {
      id: d.id,
      senderId: String(x.senderId ?? ''),
      type: 'text',
      text: String(x.text ?? ''),
      createdAt: (x.createdAt as Timestamp) ?? null,
      translation: typeof x.translation === 'string' ? x.translation : undefined,
      translationStatus,
      translationLanguage: typeof x.translationLanguage === 'string' ? x.translationLanguage : undefined,
      sourceLanguage: typeof x.sourceLanguage === 'string' ? x.sourceLanguage : undefined,
      translationsByUser,
    }
  })
}

export function useInstantMessages(sessionId: string | undefined, enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  /** When this equals `sessionId`, `messages` are for the active listener (avoids stale rows on id / toggle). */
  const [messagesSessionId, setMessagesSessionId] = useState<string | null>(null)
  /** Set only from Firestore `onSnapshot` error callback (not in effect body). */
  const [listenerFailed, setListenerFailed] = useState(false)

  useEffect(() => {
    if (!sessionId || !enabled) {
      return
    }

    const { firestore } = getFirebaseClient()
    const q = query(messagesCollectionRef(firestore, sessionId), orderBy('createdAt', 'asc'), limit(PAGE))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListenerFailed(false)
        setMessages(mapMessages(snap))
        setMessagesSessionId(sessionId)
      },
      () => {
        setMessages([])
        setMessagesSessionId(sessionId)
        setListenerFailed(true)
      },
    )
    return () => {
      unsub()
      setMessagesSessionId(null)
      setListenerFailed(false)
    }
  }, [sessionId, enabled])

  const active = Boolean(sessionId && enabled)
  const inSync = active && messagesSessionId === sessionId
  const messagesOut = inSync ? messages : []
  const loadingOut = active && !inSync && !listenerFailed

  return { messages: messagesOut, loading: loadingOut }
}
