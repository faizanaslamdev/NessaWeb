'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useInstantAuth } from '@/hooks/use-instant-auth'
import { getFirebaseClient } from '@/lib/firebase'
import { createChatSession } from '@/lib/chat/session'
import { APP_CHAT_LANGUAGES, DEFAULT_CHAT_LANGUAGE_CODE } from '@/lib/chat/languages'
import AuthErrorPanel from '@/components/chat/auth-error-panel'

export default function ChatIndexPage() {
  const router = useRouter()
  const { user, loading: authLoading, error: authError } = useInstantAuth()
  const [roomId, setRoomId] = useState('')
  const [createName, setCreateName] = useState('')
  const [createLang, setCreateLang] = useState(DEFAULT_CHAT_LANGUAGE_CODE)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleCreateRoom = async () => {
    if (!createName.trim() || !user) return
    setBusy(true)
    setErr(null)
    try {
      const { firestore } = getFirebaseClient()
      const id = await createChatSession(firestore, user.uid, createName.trim(), createLang)
      router.push(`/chat/${id}?share=1`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create session')
    } finally {
      setBusy(false)
    }
  }

  const handleJoinRoom = () => {
    const id = roomId.trim()
    if (id) router.push(`/chat/${id}`)
  }

  if (authError) {
    return <AuthErrorPanel authError={authError} />
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-linear-to-br from-purple-600/30 to-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-linear-to-br from-purple-600/20 to-violet-600/30 blur-3xl" />
      </div>

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

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/20 bg-linear-to-br from-white/10 to-white/5 p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-3">Instant Chat</h1>
            <p className="text-gray-400">Create a new room or join an existing one</p>
          </div>

          <div className="mb-6 rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs font-medium text-gray-300 mb-2">Start a new room</p>
            <Input
              placeholder="Your display name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              variant="landing"
              className="mb-3"
              disabled={authLoading || busy}
            />
            <select
              value={createLang}
              onChange={(e) => setCreateLang(e.target.value)}
              disabled={authLoading || busy}
              className="mb-3 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {APP_CHAT_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            <Button
              onClick={() => void handleCreateRoom()}
              disabled={authLoading || busy || !createName.trim() || !user}
              className="w-full bg-linear-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold py-3"
            >
              {authLoading ? 'Signing in…' : busy ? 'Creating…' : 'Create New Room'}
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black text-gray-400">Or join existing</span>
            </div>
          </div>

          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              variant="landing"
              disabled={authLoading}
            />
            <Button
              onClick={handleJoinRoom}
              disabled={!roomId.trim() || authLoading}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 font-semibold py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Room
            </Button>
          </div>

          {err && <p className="mt-4 text-center text-sm text-red-400">{err}</p>}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">No signup required. Just chat and go!</p>
      </div>
    </div>
  )
}
