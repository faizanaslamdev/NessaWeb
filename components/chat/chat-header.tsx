'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
  roomId: string
  participantCount: number
  onShare?: () => void
  onSettings?: () => void
  /** Shown only below `lg` — opens full participant list (sidebar is desktop-only). */
  onOpenParticipants?: () => void
}

export default function ChatHeader({
  roomId,
  participantCount,
  onShare,
  onSettings,
  onOpenParticipants,
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

        <div className="flex shrink-0 gap-2">
          {onOpenParticipants && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenParticipants}
              title="People in this room"
              className="border-white/20 px-2.5 text-white hover:bg-white/10 sm:px-3 lg:hidden"
              aria-label="View everyone in this room"
            >
              <UsersIcon className="size-4" />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onShare}
            title="Share room"
            aria-label="Share room"
            className="border-white/20 px-2.5 text-white hover:bg-white/10 sm:px-3 lg:px-3"
          >
            <ShareIcon className="size-4 lg:hidden" aria-hidden />
            <span className="hidden text-xs sm:text-sm lg:inline">Share</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onSettings}
            title="Room settings"
            aria-label="Room settings"
            className="border-white/20 px-2.5 text-white hover:bg-white/10 sm:px-3"
          >
            <SettingsIcon className="size-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="m8.59 13.51 6.83 3.98M15.41 6.51 8.59 10.49"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm12 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
