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
import { deferredFirestoreSubscribe } from '@/lib/deferred-firestore-subscribe'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId || !enabled) {
      return
    }

    let cancelled = false
    const cleanupOuter = deferredFirestoreSubscribe(() => {
      if (cancelled) {
        return () => {}
      }
      const { firestore } = getFirebaseClient()
      const q = query(messagesCollectionRef(firestore, sessionId), orderBy('createdAt', 'asc'), limit(PAGE))
      return onSnapshot(
        q,
        (snap) => {
          if (cancelled) return
          setMessages(mapMessages(snap))
          setLoading(false)
        },
        () => {
          if (!cancelled) setLoading(false)
        },
      )
    })

    return () => {
      cancelled = true
      cleanupOuter()
    }
  }, [sessionId, enabled])

  const active = Boolean(sessionId && enabled)
  return {
    messages: active ? messages : [],
    loading: active && loading,
  }
}
