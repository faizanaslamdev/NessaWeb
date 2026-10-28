'use client'

/**
 * Instant chat: start a temporary room (anonymous guest session) or join one
 * by its code. Same behaviour as before; restyled for the site.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Icon } from '@/components/dash/icons'
import { siteButtonClass } from '@/components/site/ui'
import { useInstantAuth } from '@/hooks/use-instant-auth'
import { createChatSession } from '@/lib/chat/session'
import { APP_CHAT_LANGUAGES, DEFAULT_CHAT_LANGUAGE_CODE } from '@/lib/chat/languages'
import { getFirebaseClient } from '@/lib/firebase'

const field =
  'block h-12 w-full rounded-xl border border-n-line-strong bg-n-surface px-3.5 text-[15px] text-n-ink outline-none transition-colors placeholder:text-n-faint focus:border-n-accent focus:ring-4 focus:ring-n-accent/12 disabled:bg-n-sunken'

export function InstantChatLobby() {
  const router = useRouter()
  const { user, loading: authLoading, error: authError } = useInstantAuth()
  const [roomId, setRoomId] = useState('')
  const [createName, setCreateName] = useState('')
  const [createLang, setCreateLang] = useState(DEFAULT_CHAT_LANGUAGE_CODE)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim() || !user) return
    setBusy(true)
    setErr(null)
    try {
      const { firestore } = getFirebaseClient()
      const id = await createChatSession(firestore, user.uid, createName.trim(), createLang)
      router.push(`/chat/${id}?share=1`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create the room')
    } finally {
      setBusy(false)
    }
  }

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    const id = roomId.trim()
    if (id) router.push(`/chat/${encodeURIComponent(id)}`)
  }

  if (authError) {
    return (
      <div role="alert" className="rounded-2xl border border-n-danger/30 bg-n-danger-soft p-6 text-[15px] text-n-danger">
        <p className="font-semibold">Instant chat isn’t available right now.</p>
        <p className="mt-1 text-n-ink-2">{authError.message.split(/\n\n+/)[0]}</p>
      </div>
    )
  }

  return (
    <div className="rounded-[24px] border border-n-line bg-n-surface p-5 shadow-[0_1px_2px_rgb(27_26_23/0.04),0_16px_40px_-16px_rgb(27_26_23/0.16)] sm:p-7">
      <form onSubmit={e => void handleCreateRoom(e)} aria-labelledby="create-room-title">
        <h2 id="create-room-title" className="text-[18px] font-semibold">
          Start a room
        </h2>
        <p className="mt-1 text-[14px] text-n-muted">You’ll get a link and QR code to invite people.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_190px]">
          <label className="block">
            <span className="sr-only">Your name</span>
            <input
              className={field}
              placeholder="Your name"
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              disabled={authLoading || busy}
              maxLength={40}
              autoComplete="nickname"
            />
          </label>
          <label className="relative block">
            <span className="sr-only">Your language</span>
            <select
              value={createLang}
              onChange={e => setCreateLang(e.target.value)}
              disabled={authLoading || busy}
              className={`${field} cursor-pointer appearance-none pr-9`}
            >
              {APP_CHAT_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" size={16} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-n-subtle" />
          </label>
        </div>
        <button
          type="submit"
          disabled={authLoading || busy || !createName.trim() || !user}
          className={siteButtonClass('primary', 'lg', 'mt-3 w-full')}
        >
          {authLoading ? 'Getting ready…' : busy ? 'Creating…' : 'Create room'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-[13px] text-n-subtle">
        <span className="h-px flex-1 bg-n-line" />
        or join with a room code
        <span className="h-px flex-1 bg-n-line" />
      </div>

      <form onSubmit={handleJoinRoom} className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Room code</span>
          <input
            className={field}
            placeholder="Room code"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            disabled={authLoading}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        <button type="submit" disabled={!roomId.trim() || authLoading} className={siteButtonClass('secondary', 'lg', 'h-12')}>
          Join
        </button>
      </form>

      {err ? (
        <p role="alert" className="mt-4 rounded-xl bg-n-danger-soft px-4 py-3 text-[14px] text-n-danger">
          {err}
        </p>
      ) : null}
    </div>
  )
}
