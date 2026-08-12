'use client'

import { motion } from 'framer-motion'
import { ParticipantsList, type ChatParticipant } from '@/components/chat/participants-list'

interface ParticipantsSidebarProps {
  participants: ChatParticipant[]
  title?: string
}

export default function ParticipantsSidebar({
  participants,
  title,
}: ParticipantsSidebarProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="hidden w-64 flex-col border-l border-white/10 bg-black/50 lg:flex"
    >
      <div className="shrink-0 border-b border-white/10 p-4">
        <h2 className="text-sm font-semibold text-white">
          {title ?? `Participants (${participants.length})`}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
        <ParticipantsList participants={participants} />
      </div>
    </motion.div>
  )
}
