'use client'

import { cn } from '@/lib/utils'

export interface ChatParticipant {
  id: string
  name: string
  avatar: string
  isOnline: boolean
}

export function ParticipantsList({
  participants,
  className,
}: {
  participants: ChatParticipant[]
  className?: string
}) {
  return (
    <div className={cn('overflow-x-hidden', className)}>
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="border-b border-white/5 px-4 py-3 transition-colors last:border-b-0 hover:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-purple-600 to-violet-600 text-xs font-semibold text-white sm:h-10 sm:w-10">
                {participant.avatar}
              </div>
              {participant.isOnline && (
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-green-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{participant.name}</p>
              <p className="text-xs text-gray-500">{participant.isOnline ? 'Online' : 'Away'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
