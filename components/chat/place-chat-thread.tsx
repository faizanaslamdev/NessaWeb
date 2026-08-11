'use client'

/**
 * Place Chat thread — reuses Instant ChatThread composer + MessageBubble UI
 * with Place Chat data adapter (callable send + place_chats messages).
 */

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { User } from 'firebase/auth'

import MessageBubble from '@/components/chat/message-bubble'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getFirebaseClient } from '@/lib/firebase'
import {
  sendPlaceChatMessage,
  subscribePlaceChatMessages,
  type PlaceChatMessage,
} from '@/lib/place-chat/api'
import { PLACE_CHAT_MESSAGE_TEXT_MAX } from '@/lib/place-chat/constants'
import { appStores, placeAppDeepLink, siteConfig } from '@/lib/constants'

type PlaceChatThreadProps = {
  placeId: string
  placeName?: string | null
  user: User
  displayName: string
  preferredLanguage: string
  onSendError: (message: string) => void
}

function formatPlaceMessageTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function PlaceChatThread({
  placeId,
  placeName,
  user,
  displayName,
  preferredLanguage,
  onSendError,
}: PlaceChatThreadProps) {
  const [messages, setMessages] = useState<PlaceChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const onSendErrorRef = useRef(onSendError)
  onSendErrorRef.current = onSendError

  useEffect(() => {
    const { firestore } = getFirebaseClient()
    setMessagesLoading(true)
    const unsub = subscribePlaceChatMessages(
      firestore,
      placeId,
      list => {
        setMessages(list)
        setMessagesLoading(false)
      },
      err => {
        setMessagesLoading(false)
        onSendErrorRef.current(err.message || 'Could not load messages')
      },
    )
    return () => unsub()
  }, [placeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return
    const text = inputValue
    setInputValue('')
    try {
      await sendPlaceChatMessage({
        placeId,
        uid: user.uid,
        displayName,
        text,
        placeName,
      })
    } catch (e) {
      setInputValue(text)
      onSendError(e instanceof Error ? e.message : 'Send failed')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-linear-to-b from-black via-black to-black/80"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 sm:py-6">
        {messagesLoading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400">No messages yet today. Say hello!</p>
              <p className="mt-2 text-xs text-gray-500">
                Messages disappear after 24 hours. The room stays open.
              </p>
            </div>
          </div>
        ) : (
          messages.map(m => {
            const isSent = m.senderId === user.uid
            const name = m.displayName || 'Traveler'
            const av = name[0]?.toUpperCase() ?? '?'
            return (
              <MessageBubble
                key={m.id}
                message={m.text}
                isSent={isSent}
                senderName={name}
                timestamp={formatPlaceMessageTime(m.createdAtMs)}
                avatar={av}
                preferredLanguage={preferredLanguage}
                viewerUserId={user.uid}
                isGroupChat
              />
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="shrink-0 border-t border-white/10 bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-6"
      >
        <div className="flex items-end gap-2 sm:gap-3">
          <Textarea
            placeholder="Type a message…"
            value={inputValue}
            onChange={e =>
              setInputValue(e.target.value.slice(0, PLACE_CHAT_MESSAGE_TEXT_MAX))
            }
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSendMessage()
              }
            }}
            variant="landing"
            rows={1}
            maxLength={PLACE_CHAT_MESSAGE_TEXT_MAX}
            className="field-sizing-content max-h-[calc(1.25rem*5+1rem)] min-h-9 flex-1 resize-none overflow-y-auto py-2 text-base leading-5 md:text-base"
          />
          <Button
            type="button"
            onClick={() => void handleSendMessage()}
            disabled={!inputValue.trim()}
            title="Send message"
            aria-label="Send message"
            className="h-9 w-9 shrink-0 bg-linear-to-r from-purple-600 to-violet-600 p-0 font-medium text-white hover:from-purple-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:min-h-9 sm:w-auto sm:px-6"
          >
            <SendIcon className="size-[1.2rem] sm:hidden" aria-hidden />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-500">
          Guest chat on {siteConfig.name}.{' '}
          <a
            href={placeAppDeepLink(placeId)}
            className="text-violet-300 underline-offset-2 hover:underline"
          >
            Open in app
          </a>
          {' · '}
          <a
            href={appStores[0]?.url ?? '/'}
            className="text-violet-300 underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Get the app
          </a>
        </p>
      </motion.div>
    </motion.div>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M22 2 11 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m22 2-7 20-4-9-9-4 20-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
