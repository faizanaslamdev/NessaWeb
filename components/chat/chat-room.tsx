'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import MessageBubble from './message-bubble'
import ChatHeader from './chat-header'
import ParticipantsSidebar from './participants-sidebar'
import EntryModal from './entry-modal'
import AuthErrorPanel from './auth-error-panel'
import ChatEndedOverlay from './chat-ended-overlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CopyLinkButton from '@/components/chat/copy-link-button'
import { useInstantAuth } from '@/hooks/use-instant-auth'
import { useInstantSession } from '@/hooks/use-instant-session'
import { useInstantMessages } from '@/hooks/use-instant-messages'
import { usePresenceByUserIds, useInstantPresenceTracking } from '@/hooks/use-presence-web'
import { getFirebaseClient } from '@/lib/firebase'
import { isTimeBasedExpired } from '@/lib/chat/expiry'
import { joinSessionMember, sendChatMessage, expireSessionAsUser } from '@/lib/chat/session'
import { formatMessageTime } from '@/lib/chat/format'

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

  const messagesEnabled = Boolean(session && member)
  const { messages, loading: messagesLoading } = useInstantMessages(roomId, messagesEnabled && !ended)

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

  const [inputValue, setInputValue] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [copyNotice, setCopyNotice] = useState<null | { kind: 'success' | 'error'; text: string }>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const myMember = user && session ? session.members[user.uid] : undefined

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

  const handleSendMessage = async () => {
    if (!user || !inputValue.trim() || ended || session?.status !== 'active') return
    const text = inputValue
    setInputValue('')
    try {
      const { firestore } = getFirebaseClient()
      await sendChatMessage(firestore, roomId, user.uid, text)
    } catch (e) {
      showNotice('error', e instanceof Error ? e.message : 'Send failed')
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

      <EntryModal
        roomId={roomId}
        isOpen={entryModalOpen}
        variant={hostInviteOpen ? 'invite-host' : 'join'}
        onClose={() => router.push('/chat')}
        onContinue={() => router.replace(`/chat/${roomId}`)}
        onJoin={handleJoinChat}
      />

      {!entryModalOpen && member && (
        <>
          <ChatHeader
            roomId={roomId}
            participantCount={participants.filter((p) => p.isOnline).length}
            onShare={handleShare}
            onSettings={() => setShowSettings(true)}
          />

          {showSettings && (
            <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center sm:p-6">
              <button
                aria-label="Close settings"
                type="button"
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowSettings(false)}
              />
              <div className="relative z-110 w-full max-h-[min(92dvh,920px)] overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:max-w-xl sm:px-0 sm:pb-0 sm:pt-0 lg:max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="rounded-t-2xl border border-white/15 border-b-0 bg-linear-to-br from-white/12 to-white/5 p-5 shadow-2xl shadow-black/50 sm:rounded-2xl sm:border-b sm:p-6 md:p-8"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-semibold tracking-tight text-white md:text-2xl">Room settings</h2>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 self-end border-white/20 text-white hover:bg-white/10 sm:self-start"
                      onClick={() => setShowSettings(false)}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4 md:mt-5 md:pt-5">
                    <p className="text-sm font-medium text-gray-200 md:text-base">Invite others</p>
                    <p className="mt-0.5 text-xs text-gray-500">QR or link — same join screen for guests.</p>
                    <div className="mt-3 grid grid-cols-1 items-start gap-4 md:mt-4 md:grid-cols-[minmax(0,11rem)_1fr] md:items-stretch md:gap-6 lg:grid-cols-[minmax(0,13rem)_1fr]">
                      <div className="mx-auto flex w-[min(11rem,72vw)] max-w-52 shrink-0 justify-center md:mx-0 md:w-full md:max-w-52 md:items-center md:self-stretch">
                        <div className="flex aspect-square w-full max-w-52 items-center justify-center rounded-2xl border-2 border-dashed border-purple-400/45 bg-white/6 p-2.5">
                        {origin ? (
                          <div className="flex h-full w-full max-h-50 max-w-50 items-center justify-center rounded-xl bg-white p-2">
                            <QRCode
                              value={roomLink}
                              size={168}
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
                      <div className="flex min-h-0 min-w-0 flex-col gap-5 md:gap-6">
                        <div className="min-w-0 space-y-2">
                          <span className="text-xs font-medium text-gray-400 md:text-sm">Share link</span>
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
                            <Input
                              readOnly
                              value={roomLink}
                              variant="landing"
                              className="min-h-10 min-w-0 flex-1 font-mono text-xs leading-normal text-gray-200 md:text-sm"
                            />
                            <CopyLinkButton
                              textToCopy={roomLink}
                              size="default"
                              label="Copy link"
                              className="shrink-0 lg:self-stretch"
                              onCopied={(ok) =>
                                showNotice(ok ? 'success' : 'error', ok ? 'Link copied' : 'Copy blocked by browser')
                              }
                            />
                          </div>
                        </div>
                        <div className="min-w-0 space-y-2">
                          <span className="text-xs font-medium text-gray-400 md:text-sm">Room ID</span>
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
                            <Input
                              readOnly
                              value={roomId}
                              variant="landing"
                              className="min-h-10 min-w-0 flex-1 font-mono text-xs leading-normal text-purple-200 md:text-sm"
                            />
                            <CopyLinkButton
                              textToCopy={roomId}
                              size="default"
                              styleVariant="outline"
                              label="Copy ID"
                              copiedLabel="✓ Copied"
                              className="shrink-0 border-white/20 lg:self-stretch"
                              onCopied={(ok) =>
                                showNotice(ok ? 'success' : 'error', ok ? 'Room ID copied' : 'Copy blocked by browser')
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 md:mt-5 md:flex-row md:justify-end md:gap-3 md:pt-4">
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden bg-linear-to-b from-black via-black to-black/80"
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 sm:py-6">
                {messagesLoading && messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400 text-sm">Loading messages…</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-4">💬</div>
                      <p className="text-gray-400">No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isSent = m.senderId === user?.uid
                    const name = session.members[m.senderId]?.displayName ?? 'Guest'
                    const av = name[0]?.toUpperCase() ?? '?'
                    return (
                      <MessageBubble
                        key={m.id}
                        message={m.text}
                        isSent={isSent}
                        senderName={name}
                        timestamp={formatMessageTime(m.createdAt)}
                        avatar={av}
                        preferredLanguage={myMember?.language ?? 'en'}
                        viewerUserId={user?.uid ?? 'me'}
                        isGroupChat={memberUids.length > 1}
                        translation={m.translation}
                        translationStatus={m.translationStatus}
                        translationLanguage={m.translationLanguage}
                        sourceLanguage={m.sourceLanguage}
                        translationsByUser={m.translationsByUser}
                      />
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="shrink-0 border-t border-white/10 bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-6"
              >
                <div className="flex gap-2 sm:gap-3">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void handleSendMessage()}
                    variant="landing"
                    className="flex-1 text-sm"
                    disabled={ended || session.status !== 'active'}
                  />
                  <Button
                    onClick={() => void handleSendMessage()}
                    disabled={!inputValue.trim() || ended || session.status !== 'active'}
                    className="bg-linear-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-6"
                  >
                    Send
                  </Button>
                </div>
              </motion.div>
            </motion.div>

            <ParticipantsSidebar participants={participants} />
          </div>
        </>
      )}
    </div>
  )
}
