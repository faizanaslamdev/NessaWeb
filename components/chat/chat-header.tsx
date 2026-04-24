'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
  roomId: string
  participantCount: number
  onShare?: () => void
  onSettings?: () => void
}

export default function ChatHeader({
  roomId,
  participantCount,
  onShare,
  onSettings,
}: ChatHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-40"
    >
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-white mb-1">
            Chat Room
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm text-gray-400">
              Room ID: <span className="font-mono text-purple-400">{roomId}</span>
            </p>
            <span className="text-xs text-gray-500">•</span>
            <p className="text-xs sm:text-sm text-gray-400">
              <span className="text-green-400 font-semibold">{participantCount}</span> online
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onShare}
            className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm"
          >
            Share
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onSettings}
            className="border-white/20 text-white hover:bg-white/10 text-xs sm:text-sm"
          >
            ⚙️
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
