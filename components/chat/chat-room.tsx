'use client'

import { useEffect, useMemo, useState } from 'react'
import { waitForPendingWrites } from 'firebase/firestore'
import { motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ChatHeader from './chat-header'
import ChatThread from './chat-thread'
import ParticipantsSidebar from './participants-sidebar'
import EntryModal from './entry-modal'
import AuthErrorPanel from './auth-error-panel'
import ChatEndedOverlay from './chat-ended-overlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CopyLinkButton from '@/components/chat/copy-link-button'
import { useInstantAuth } from '@/hooks/use-instant-auth'
import { useInstantSession } from '@/hooks/use-instant-session'
import { usePresenceByUserIds, useInstantPresenceTracking } from '@/hooks/use-presence-web'
import { getFirebaseClient } from '@/lib/firebase'
import { isTimeBasedExpired } from '@/lib/chat/expiry'
import { joinSessionMember, expireSessionAsUser } from '@/lib/chat/session'
import { shareUrlWithoutScheme } from '@/lib/chat/format'

interface ChatRoomProps {
  roomId: string
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, error: authError } = useInstantAuth()
  const { session, loading: sessionLoading, error: sessionError } = useInstantSession(roomId)

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 20_000)
    return () => clearInterval(t)
  }, [])

  const [origin] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : '',
  )

  const roomLink = origin ? `${origin}/chat/${roomId}` : `/chat/${roomId}`

  const member = useMemo(() => {
    if (!user || !session) return false
    return Boolean(session.members[user.uid])
  }, [user, session])

  /** Until this client’s writes (e.g. join) are committed, message rules’ `get(session)` can deny reads while the snapshot already shows you in `members`. */
  const [memberFirestoreSynced, setMemberFirestoreSynced] = useState(false)
  useEffect(() => {
    if (!member || !user) {
      queueMicrotask(() => setMemberFirestoreSynced(false))
      return
    }
    let cancelled = false
    const { firestore } = getFirebaseClient()
    queueMicrotask(() => {
      if (cancelled) return
      setMemberFirestoreSynced(false)
      void waitForPendingWrites(firestore).finally(() => {
        if (!cancelled) setMemberFirestoreSynced(true)
      })
    })
    return () => {
      cancelled = true
    }
  }, [member, user])

  const timeEnded = useMemo(() => {
    if (!session) return false
    return isTimeBasedExpired({
      nowMs,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
    })
  }, [session, nowMs])

  const statusEnded = session?.status === 'expired'
  const ended = Boolean(statusEnded || timeEnded)

  const memberUids = useMemo(() => (session ? Object.keys(session.members) : []), [session])
  const presenceByUser = usePresenceByUserIds(memberUids)

  useInstantPresenceTracking(user?.uid, Boolean(user && session && session.status === 'active' && member && !ended))

  const participants = useMemo(() => {
    if (!session) return []
    return memberUids.map((uid) => {
      const m = session.members[uid]
      const name = m?.displayName ?? 'Guest'
      return {
        id: uid,
        name,
        avatar: name[0]?.toUpperCase() ?? '?',
        isOnline: presenceByUser[uid]?.state === 'online',
      }
    })
  }, [session, memberUids, presenceByUser])

  const shareInviteIntent = searchParams.get('share') === '1'
  const isRoomCreator = Boolean(user && session?.createdById === user.uid)
  const guestEntryOpen = Boolean(session && user && !ended && !member)
  const hostInviteOpen = Boolean(session && user && !ended && member && shareInviteIntent && isRoomCreator)
  const entryModalOpen = guestEntryOpen || hostInviteOpen

  const [showSettings, setShowSettings] = useState(false)
  const [copyNotice, setCopyNotice] = useState<null | { kind: 'success' | 'error'; text: string }>(null)

  const myMember = user && session ? session.members[user.uid] : undefined

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  const showNotice = (kind: 'success' | 'error', text: string) => {
    setCopyNotice({ kind, text })
    setTimeout(() => setCopyNotice(null), 1800)
  }

  const handleJoinChat = async (data: { name: string; language: string }) => {
    if (!user) return
    try {
      const { firestore } = getFirebaseClient()
      await joinSessionMember(firestore, roomId, user.uid, data.name, data.language)
    } catch (e) {
      showNotice('error', e instanceof Error ? e.message : 'Join failed')
    }
  }

  const handleShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as Navigator & { share: (data: { title?: string; url?: string }) => Promise<void> }).share({
          title: 'NessaChat room',
          url: roomLink,
        })
        return
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'AbortError') {
        return
      }
    }
    setShowSettings(true)
    showNotice('success', 'Open settings to copy link')
  }

  const handleLeaveRoom = () => {
    router.push('/chat')
  }

  const handleEndRoom = async () => {
    try {
      const { firestore } = getFirebaseClient()
      await expireSessionAsUser(firestore, roomId)
      setShowSettings(false)
    } catch (e) {
      showNotice('error', e instanceof Error ? e.message : 'Could not end chat')
    }
  }

  if (authError) {
    return <AuthErrorPanel authError={authError} />
  }

  if (authLoading || sessionLoading) {
    return (
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-black text-gray-400">
        Loading…
      </div>
    )
  }

  if (sessionError || (!session && !sessionError)) {
    return (
      <div className="fixed inset-0 z-0 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-gray-300">This session is not available.</p>
        <Button asChild className="bg-purple-600 text-white hover:bg-purple-700">
          <Link href="/chat">Back to lobby</Link>
        </Button>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden bg-black">
      {copyNotice && (
        <div className="fixed top-4 right-4 z-120 max-w-[min(calc(100vw-2rem),20rem)]">
          <div
            className={[
              'rounded-xl border px-4 py-2 text-sm backdrop-blur-md',
              copyNotice.kind === 'success'
                ? 'border-white/15 bg-black/60 text-white'
                : 'border-red-500/30 bg-black/70 text-red-200',
            ].join(' ')}
          >
            {copyNotice.text}
          </div>
        </div>
      )}

      {ended && <ChatEndedOverlay variant={statusEnded ? 'expired' : 'time'} />}

      {member && !memberFirestoreSynced && !ended && (
        <div className="fixed inset-0 z-95 flex items-center justify-center bg-black/90 text-gray-300">
          <p className="text-sm">Connecting to chat…</p>
        </div>
      )}

      <EntryModal
        roomId={roomId}
        isOpen={entryModalOpen}
        variant={hostInviteOpen ? 'invite-host' : 'join'}
        onClose={() => router.push('/chat')}
        onContinue={() => router.replace(`/chat/${roomId}`)}
        onJoin={handleJoinChat}
      />

      {!entryModalOpen && member && memberFirestoreSynced && (
        <>
          <ChatHeader
            roomId={roomId}
            participantCount={participants.filter((p) => p.isOnline).length}
            onShare={handleShare}
            onSettings={() => setShowSettings(true)}
          />

          {showSettings && (
            <div className="fixed inset-0 z-100 flex items-center justify-center px-3 py-6 sm:p-6">
              <button
                aria-label="Close settings"
                type="button"
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowSettings(false)}
              />
              <div className="relative z-110 w-full max-h-[min(calc(100dvh-3rem),900px)] overflow-y-auto overscroll-contain sm:max-w-xl lg:max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="rounded-2xl border border-white/15 bg-linear-to-br from-white/12 to-white/5 p-4 shadow-2xl shadow-black/50 sm:p-6 md:p-8"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <h2 className="min-w-0 truncate text-lg font-semibold tracking-tight text-white sm:text-xl md:text-2xl">
                      Room settings
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-white/20 text-white hover:bg-white/10"
                      onClick={() => setShowSettings(false)}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="mt-4 sm:mt-5 md:mt-6">
                    <p className="text-sm font-medium text-gray-200 md:text-base">Invite others</p>
                    <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">QR or link — same join screen for guests.</p>
                    <div className="mt-2.5 grid grid-cols-1 items-start gap-3 sm:mt-3 sm:gap-4 md:grid-cols-[minmax(0,11rem)_1fr] md:items-stretch md:gap-6 lg:grid-cols-[minmax(0,13rem)_1fr]">
                      <div className="mx-auto flex w-[min(9.5rem,64vw)] max-w-44 shrink-0 justify-center sm:w-[min(11rem,72vw)] sm:max-w-52 md:mx-0 md:w-full md:max-w-52 md:items-center md:self-stretch">
                        <div className="flex aspect-square w-full max-w-44 items-center justify-center rounded-xl border-2 border-dashed border-purple-400/45 bg-white/6 p-1.5 sm:max-w-52 sm:rounded-2xl sm:p-2.5">
                          {origin ? (
                            <div className="flex h-full w-full max-h-44 max-w-44 items-center justify-center rounded-lg bg-white p-1.5 sm:max-h-50 sm:max-w-50 sm:rounded-xl sm:p-2">
                              <QRCode
                                value={roomLink}
                                size={152}
                                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                              />
                            </div>
                          ) : (
                            <div className="px-2 text-center">
                              <p className="mb-1 text-2xl" aria-hidden>
                                📱
                              </p>
                              <p className="text-[11px] text-gray-500">Open in the browser for a scannable QR.</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-gray-400 md:text-sm">Share link</span>
                          <div className="mt-1.5 flex flex-row items-stretch gap-2">
                            <Input
                              readOnly
                              value={shareUrlWithoutScheme(roomLink)}
                              title={roomLink}
                              variant="landing"
                              className="min-h-9 min-w-0 flex-1 font-mono text-[11px] leading-normal text-gray-200 sm:min-h-10 sm:text-xs md:text-sm"
                              onCopy={(e) => {
                                e.preventDefault()
                                e.clipboardData?.setData('text/plain', roomLink)
                              }}
                            />
                            <CopyLinkButton
                              textToCopy={roomLink}
                              size="sm"
                              label="Copy link"
                              className="h-9 shrink-0 self-stretch sm:h-10"
                              onCopied={(ok) =>
                                showNotice(ok ? 'success' : 'error', ok ? 'Link copied' : 'Copy blocked by browser')
                              }
                            />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-gray-400 md:text-sm">Room ID</span>
                          <div className="mt-1.5 flex flex-row items-stretch gap-2">
                            <Input
                              readOnly
                              value={roomId}
                              variant="landing"
                              className="min-h-9 min-w-0 flex-1 font-mono text-[11px] leading-normal text-purple-200 sm:min-h-10 sm:text-xs md:text-sm"
                            />
                            <CopyLinkButton
                              textToCopy={roomId}
                              size="sm"
                              styleVariant="outline"
                              label="Copy ID"
                              copiedLabel="✓ Copied"
                              className="h-9 shrink-0 self-stretch border-white/20 sm:h-10"
                              onCopied={(ok) =>
                                showNotice(ok ? 'success' : 'error', ok ? 'Room ID copied' : 'Copy blocked by browser')
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 sm:mt-6 md:flex-row md:justify-end md:gap-3">
                    <Button variant="destructive" className="w-full md:w-auto" onClick={() => void handleEndRoom()}>
                      End chat for everyone
                    </Button>
                    <Button variant="destructive" className="w-full md:w-auto" onClick={handleLeaveRoom}>
                      Leave room
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 overflow-hidden">
            {user && myMember ? (
              <ChatThread
                key={roomId}
                roomId={roomId}
                ended={ended}
                session={session}
                user={user}
                myMember={myMember}
                memberUids={memberUids}
                onSendError={(msg) => showNotice('error', msg)}
              />
            ) : null}

            <ParticipantsSidebar participants={participants} />
          </div>
        </>
      )}
    </div>
  )
}
