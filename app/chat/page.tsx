'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function ChatIndexPage() {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      router.push(`/chat/${roomId}`)
    }
  }

  const handleCreateRoom = () => {
    const newRoomId = `room-${Math.random().toString(36).slice(2, 11)}`
    router.push(`/chat/${newRoomId}`)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      {/* Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-linear-to-br from-purple-600/30 to-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-linear-to-br from-purple-600/20 to-violet-600/30 blur-3xl" />
      </div>

      {/* Back to landing */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="group border-white/15 bg-black/20 text-white hover:bg-white/10 hover:border-purple-500/30 transition-colors"
        >
          <Link href="/" className="gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="size-4 text-white/80 group-hover:text-white transition-colors"
            >
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </Link>
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/20 bg-linear-to-br from-white/10 to-white/5 p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-3">
              Instant Chat
            </h1>
            <p className="text-gray-400">
              Create a new room or join an existing one
            </p>
          </div>

          {/* Create Room */}
          <Button
            onClick={handleCreateRoom}
            className="w-full bg-linear-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold py-3 mb-4"
          >
            Create New Room
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black text-gray-400">Or join existing</span>
            </div>
          </div>

          {/* Join Room */}
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              variant="landing"
            />
            <Button
              onClick={handleJoinRoom}
              disabled={!roomId.trim()}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 font-semibold py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Room
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-gray-500 text-sm mt-6">
          No signup required. Just chat and go!
        </p>
      </div>
    </div>
  )
}
