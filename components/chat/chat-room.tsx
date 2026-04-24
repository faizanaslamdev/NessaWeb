'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import MessageBubble from './message-bubble'
import ChatHeader from './chat-header'
import ParticipantsSidebar from './participants-sidebar'
import EntryModal from './entry-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CopyLinkButton from '@/components/chat/copy-link-button'

interface Message {
  id: string
  sender: string
  avatar: string
  message: string
  timestamp: string
  isSent: boolean
}

interface Participant {
  id: string
  name: string
  avatar: string
  isOnline: boolean
}

interface ChatRoomProps {
  roomId: string
}

const dummyMessages: Message[] = [
  {
    id: '1',
    sender: 'Alex',
    avatar: 'A',
    message: 'Hey! Welcome to the chat room 👋',
    timestamp: '10:30 AM',
    isSent: false,
  },
  {
    id: '2',
    sender: 'You',
    avatar: 'Y',
    message: 'Thanks! Great to be here.',
    timestamp: '10:31 AM',
    isSent: true,
  },
  {
    id: '3',
    sender: 'Sam',
    avatar: 'S',
    message: 'This is such a cool feature! No signup needed.',
    timestamp: '10:32 AM',
    isSent: false,
  },
  {
    id: '4',
    sender: 'You',
    avatar: 'Y',
    message: 'Right? Just share the link and start chatting instantly!',
    timestamp: '10:33 AM',
    isSent: true,
  },
]

const dummyParticipants: Participant[] = [
  { id: '1', name: 'Alex Johnson', avatar: 'A', isOnline: true },
  { id: '2', name: 'You', avatar: 'Y', isOnline: true },
  { id: '3', name: 'Sam Wilson', avatar: 'S', isOnline: true },
  { id: '4', name: 'Maria Garcia', avatar: 'M', isOnline: false },
  { id: '5', name: 'Chen Wei', avatar: 'C', isOnline: true },
]

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(dummyMessages)
  const [participants] = useState<Participant[]>(dummyParticipants)
  const [inputValue, setInputValue] = useState('')
  const [showModal, setShowModal] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [copyNotice, setCopyNotice] = useState<null | { kind: 'success' | 'error'; text: string }>(null)
  const [userName, setUserName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const roomLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/chat/${roomId}`
      : `/chat/${roomId}`

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: String(messages.length + 1),
        sender: userName || 'You',
        avatar: (userName || 'Y')[0].toUpperCase(),
        message: inputValue,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isSent: true,
      }
      setMessages([...messages, newMessage])
      setInputValue('')
    }
  }

  const handleJoinChat = (data: { name: string; language: string }) => {
    setUserName(data.name)
    setShowModal(false)
  }

  const showNotice = (kind: 'success' | 'error', text: string) => {
    setCopyNotice({ kind, text })
    setTimeout(() => setCopyNotice(null), 1800)
  }

  const handleShare = async () => {
    // If available, use native share sheet first (mobile).
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as Navigator & { share: (data: { title?: string; text?: string; url?: string }) => Promise<void> }).share({
          title: 'NessaChat room',
          url: roomLink,
        })
        return
      }
    } catch (err) {
      // User closed the share sheet → do nothing (no fallback).
      if (
        err &&
        typeof err === 'object' &&
        'name' in err &&
        // Safari/Chrome commonly use AbortError for user-cancelled share
        (err as { name?: string }).name === 'AbortError'
      ) {
        return
      }
      // For genuine failures, fall back below.
    }

    // Trigger copy flow via modal button (consistent behavior + styling).
    setShowSettings(true)
    showNotice('success', 'Open settings to copy link')
  }

  const handleLeaveRoom = () => {
    router.push('/chat')
  }

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Copy feedback toast */}
      {copyNotice && (
        <div className="fixed top-4 right-4 z-60">
          <div
            className={[
              'rounded-xl border px-4 py-2 text-sm backdrop-blur-md',
              copyNotice.kind === 'success'
                ? 'border-white/15 bg-black/60 text-white'
                : 'border-red-500/30 bg-black/70 text-red-200',
            ].join(' ')}
          >
            {copyNotice.text}
          </div>
        </div>
      )}

      {/* Entry Modal */}
      <EntryModal
        roomId={roomId}
        isOpen={showModal}
        onClose={() => router.push('/chat')}
        onJoin={handleJoinChat}
      />

      {/* Chat Header */}
      <ChatHeader
        roomId={roomId}
        participantCount={participants.filter((p) => p.isOnline).length}
        onShare={handleShare}
        onSettings={() => setShowSettings(true)}
      />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close settings"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <div className="absolute left-1/2 top-1/2 w-[min(560px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="rounded-2xl border border-white/15 bg-linear-to-br from-white/10 to-white/5 p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Room settings</h2>
                  <p className="text-sm text-gray-400">
                    Room ID: <span className="font-mono text-purple-300">{roomId}</span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => setShowSettings(false)}
                >
                  Close
                </Button>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-medium text-gray-300 mb-2">Share link</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      readOnly
                      value={roomLink}
                      variant="landing"
                      className="text-xs text-gray-300"
                    />
                    <CopyLinkButton
                      textToCopy={roomLink}
                      size="default"
                      label="Copy Link"
                      onCopied={(ok) =>
                        showNotice(ok ? 'success' : 'error', ok ? 'Link copied' : 'Copy blocked by browser')
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <CopyLinkButton
                    textToCopy={roomId}
                    size="default"
                    styleVariant="outline"
                    label="Copy Room ID"
                    copiedLabel="✓ Copied"
                    onCopied={(ok) =>
                      showNotice(ok ? 'success' : 'error', ok ? 'Room ID copied' : 'Copy blocked by browser')
                    }
                  />
                  <Button
                    variant="destructive"
                    className="sm:ml-auto"
                    onClick={handleLeaveRoom}
                  >
                    Leave room
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-1 flex flex-col bg-linear-to-b from-black via-black to-black/80 overflow-hidden"
        >
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-2">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-4">💬</div>
                  <p className="text-gray-400">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message.message}
                  isSent={message.isSent}
                  senderName={message.sender}
                  timestamp={message.timestamp}
                  avatar={message.avatar}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="border-t border-white/10 bg-black/50 backdrop-blur-sm p-4 sm:p-6"
          >
            <div className="flex gap-2 sm:gap-3">
              <Input
                type="text"
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !e.shiftKey && handleSendMessage()
                }
                variant="landing"
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="bg-linear-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-6"
              >
                Send
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Participants Sidebar */}
        <ParticipantsSidebar participants={participants} />
      </div>
    </div>
  )
}
