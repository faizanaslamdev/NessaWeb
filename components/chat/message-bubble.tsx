'use client'

import { motion } from 'framer-motion'

interface MessageBubbleProps {
  message: string
  isSent: boolean
  senderName: string
  timestamp?: string
  avatar?: string
}

export default function MessageBubble({
  message,
  isSent,
  senderName,
  timestamp,
  avatar,
}: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-2 mb-4 ${isSent ? 'justify-end' : 'justify-start'}`}
    >
      {!isSent && avatar && (
        <div className="h-8 w-8 rounded-full bg-linear-to-br from-purple-600 to-violet-600 shrink-0 flex items-center justify-center text-xs font-semibold text-white">
          {avatar}
        </div>
      )}

      <div className={`max-w-xs sm:max-w-md ${isSent ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isSent && (
          <p className="text-xs text-gray-400 mb-1 px-2">{senderName}</p>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl wrap-break-word ${
            isSent
              ? 'bg-linear-to-r from-purple-600 to-violet-600 text-white rounded-br-none'
              : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/20'
          }`}
        >
          <p className="text-sm">{message}</p>
        </div>
        {timestamp && (
          <p className="text-xs text-gray-500 mt-1 px-2">{timestamp}</p>
        )}
      </div>
    </motion.div>
  )
}
