'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import MessageBubble from './message-bubble'
import ChatHeader from './chat-header'
import ParticipantsSidebar from './participants-sidebar'
import EntryModal from './entry-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  const [messages, setMessages] = useState<Message[]>(dummyMessages)
  const [participants, setParticipants] = useState<Participant[]>(dummyParticipants)
  const [inputValue, setInputValue] = useState('')
  const [showModal, setShowModal] = useState(true)
  const [userName, setUserName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Entry Modal */}
      <EntryModal
        roomId={roomId}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onJoin={handleJoinChat}
      />

      {/* Chat Header */}
      <ChatHeader
        roomId={roomId}
        participantCount={participants.filter((p) => p.isOnline).length}
        onShare={() => console.log('Share clicked')}
        onSettings={() => console.log('Settings clicked')}
      />

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
