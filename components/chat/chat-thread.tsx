'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { User } from 'firebase/auth'
import MessageBubble from '@/components/chat/message-bubble'
import DownloadAppFeaturesModal from '@/components/chat/download-app-features-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useInstantMessages } from '@/hooks/use-instant-messages'
import { getFirebaseClient } from '@/lib/firebase'
import { sendChatMessage } from '@/lib/chat/session'
import type { ChatSession } from '@/lib/chat/types'
import { formatMessageTime } from '@/lib/chat/format'

type ChatThreadProps = {
  roomId: string
  ended: boolean
  session: ChatSession
  user: User
  myMember: NonNullable<ChatSession['members'][string]>
  memberUids: string[]
  onSendError: (message: string) => void
}

/**
 * Mounted only when the viewer is already a room member (not while the join modal is open).
 * Keeps the Firestore messages listener lifecycle aligned with read permissions so first join
 * reliably receives snapshots.
 */
export default function ChatThread({
  roomId,
  ended,
  session,
  user,
  myMember,
  memberUids,
  onSendError,
}: ChatThreadProps) {
  const messagesActive = !ended
  const { messages, loading: messagesLoading } = useInstantMessages(roomId, messagesActive)

  const [inputValue, setInputValue] = useState('')
  const [downloadAppModalOpen, setDownloadAppModalOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const composerDisabled = ended || session.status !== 'active'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || composerDisabled) return
    const text = inputValue
    setInputValue('')
    try {
      const { firestore } = getFirebaseClient()
      await sendChatMessage(firestore, roomId, user.uid, text)
    } catch (e) {
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
              <div className="mb-4 text-4xl">💬</div>
              <p className="text-gray-400">No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isSent = m.senderId === user.uid
            const name = session.members[m.senderId]?.displayName ?? 'Guest'
            const av = name[0]?.toUpperCase() ?? '?'
            return (
              <MessageBubble
                key={m.id}
                message={m.text}
                isSent={isSent}
                senderName={name}
                timestamp={formatMessageTime(m.createdAt)}
                avatar={av}
                preferredLanguage={myMember.language ?? 'en'}
                viewerUserId={user.uid}
                isGroupChat={memberUids.length > 1}
                translation={m.translation}
                translationStatus={m.translationStatus}
                translationLanguage={m.translationLanguage}
                sourceLanguage={m.sourceLanguage}
                translationsByUser={m.translationsByUser}
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
        <div className="flex gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Attachments — available in the mobile app"
            title="Attachments"
            disabled={composerDisabled}
            className="shrink-0 border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
            onClick={() => setDownloadAppModalOpen(true)}
          >
            <PaperclipIcon className="size-5" />
          </Button>
          <Input
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void handleSendMessage()}
            variant="landing"
            className="flex-1 text-sm"
            disabled={composerDisabled}
          />
          <Button
            onClick={() => void handleSendMessage()}
            disabled={!inputValue.trim() || composerDisabled}
            className="bg-linear-to-r from-purple-600 to-violet-600 px-4 font-medium text-white hover:from-purple-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
          >
            Send
          </Button>
        </div>
      </motion.div>

      <DownloadAppFeaturesModal
        open={downloadAppModalOpen}
        onClose={() => setDownloadAppModalOpen(false)}
      />
    </motion.div>
  )
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
