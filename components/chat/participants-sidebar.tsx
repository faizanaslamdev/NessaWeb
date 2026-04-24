'use client'

import { motion } from 'framer-motion'

interface Participant {
  id: string
  name: string
  avatar: string
  isOnline: boolean
}

interface ParticipantsSidebarProps {
  participants: Participant[]
}

export default function ParticipantsSidebar({
  participants,
}: ParticipantsSidebarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="hidden lg:flex flex-col w-64 border-l border-white/10 bg-black/50"
    >
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white">
          Participants ({participants.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {participants.map((participant, index) => (
          <motion.div
            key={participant.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-linear-to-br from-purple-600 to-violet-600 flex items-center justify-center text-xs font-semibold text-white">
                  {participant.avatar}
                </div>
                {participant.isOnline && (
                  <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-black"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{participant.name}</p>
                <p className="text-xs text-gray-500">
                  {participant.isOnline ? 'Online' : 'Away'}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
