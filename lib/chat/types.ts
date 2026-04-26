import type { Timestamp } from 'firebase/firestore'

export type ChatSessionStatus = 'active' | 'expired'

export type ChatMember = {
  displayName: string
  language: string
  joinedAt: Timestamp
}

export type ChatSession = {
  sessionId: string
  status: ChatSessionStatus
  createdAt: Timestamp | null
  expiresAt: Timestamp | null
  lastActivityAt: Timestamp | null
  members: Record<string, ChatMember>
  createdById?: string
  updatedAt?: Timestamp | null
}

export type ChatMessageTranslationStatus = 'pending' | 'completed' | 'failed'

export type ChatMessage = {
  id: string
  senderId: string
  type: 'text'
  text: string
  createdAt: Timestamp | null
  /** Populated when server-side translation exists (same shape as mobile `chats` messages). */
  translation?: string
  translationStatus?: ChatMessageTranslationStatus
  translationLanguage?: string
  sourceLanguage?: string
  translationsByUser?: Record<string, string>
}
