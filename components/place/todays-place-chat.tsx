'use client'

/**
 * Today’s Chat — embedded Place Chat on public place landing.
 * Uses Instant Chat anonymous auth; no download wall mid-conversation.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { useInstantAuth } from '@/hooks/use-instant-auth'
import { getFirebaseClient } from '@/lib/firebase'
import {
  ensurePlaceChatRoom,
  sendPlaceChatMessage,
  subscribePlaceChatMessages,
  type PlaceChatMessage,
} from '@/lib/place-chat/api'
import {
  PLACE_CHAT_GUEST_NAME_KEY,
  PLACE_CHAT_MESSAGE_TEXT_MAX,
  buildPlaceChatTitle,
  isGooglePlaceId,
} from '@/lib/place-chat/constants'
import { appStores, placeAppDeepLink, siteConfig } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  placeId: string
  placeName?: string | null
}

function readStoredGuestName(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  try {
    return localStorage.getItem(PLACE_CHAT_GUEST_NAME_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

function storeGuestName(name: string) {
  try {
    localStorage.setItem(PLACE_CHAT_GUEST_NAME_KEY, name.trim())
  } catch {
    // ignore
  }
}

function formatTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(ms))
  } catch {
    return ''
  }
}

export function TodaysPlaceChat({ placeId, placeName }: Props) {
  const valid = isGooglePlaceId(placeId)
  const { user, loading: authLoading, error: authError } = useInstantAuth()
  const [ready, setReady] = useState(false)
  const [messages, setMessages] = useState<PlaceChatMessage[]>([])
  const [text, setText] = useState('')
  const [guestName, setGuestName] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [hydratedName, setHydratedName] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [roomError, setRoomError] = useState<string | null>(null)

  const title = useMemo(() => buildPlaceChatTitle(placeName), [placeName])
  const deepLink = placeAppDeepLink(placeId)

  useEffect(() => {
    const stored = readStoredGuestName()
    queueMicrotask(() => {
      if (stored) {
        setGuestName(stored)
        setNameDraft(stored)
      }
      setHydratedName(true)
    })
  }, [])

  useEffect(() => {
    if (!valid || authLoading || authError || !user) {
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setReady(false)
        setRoomError(null)
      }
    })
    ;(async () => {
      try {
        const { firestore } = getFirebaseClient()
        await ensurePlaceChatRoom(firestore, { placeId, placeName })
        if (!cancelled) {
          setReady(true)
        }
      } catch {
        if (!cancelled) {
          setRoomError('Could not open today’s chat. Try again in a moment.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [valid, authLoading, authError, user, placeId, placeName])

  useEffect(() => {
    if (!ready || !user) {
      queueMicrotask(() => setMessages([]))
      return
    }
    const { firestore } = getFirebaseClient()
    return subscribePlaceChatMessages(
      firestore,
      placeId,
      setMessages,
      () => setRoomError('Lost connection to chat.'),
    )
  }, [ready, user, placeId])

  const handleJoinName = () => {
    const n = nameDraft.trim()
    if (!n || n.length > 40) {
      return
    }
    storeGuestName(n)
    setGuestName(n)
  }

  const handleSend = async () => {
    if (!user || !guestName || !ready) {
      return
    }
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }
    setText('')
    setSendError(null)
    try {
      await sendPlaceChatMessage({
        placeId,
        uid: user.uid,
        displayName: guestName,
        text: trimmed,
        placeName,
      })
    } catch {
      setText(trimmed)
      setSendError('Could not send. Try again.')
    }
  }

  if (!valid) {
    return null
  }

  return (
    <section
      id="todays-chat"
      tabIndex={-1}
      className="mt-8 w-full scroll-mt-6 text-left outline-none"
      aria-label="Today's Chat"
    >
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-100">Today’s Chat</h2>
        <p className="mt-1 text-sm text-gray-400">
          {title} · messages disappear after 24 hours
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        {authLoading || !hydratedName ? (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            Connecting…
          </div>
        ) : authError ? (
          <div className="space-y-3 px-4 py-8 text-center">
            <p className="text-sm text-gray-300">
              Chat is temporarily unavailable.
            </p>
            <p className="whitespace-pre-wrap text-xs text-gray-500">
              {authError.message}
            </p>
          </div>
        ) : roomError ? (
          <div className="px-4 py-8 text-center text-sm text-gray-300">
            {roomError}
          </div>
        ) : !guestName ? (
          <div className="space-y-3 px-4 py-6">
            <p className="text-sm text-gray-300">
              Pick a display name to join today’s conversation.
            </p>
            <div className="flex gap-2">
              <Input
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value.slice(0, 40))}
                placeholder="Your name"
                className="bg-black/30"
                maxLength={40}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleJoinName()
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleJoinName}
                disabled={!nameDraft.trim()}
              >
                Join
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Guest session — no account required. Private chats stay private.
            </p>
          </div>
        ) : (
          <>
            <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Be the first to say something today.
                </p>
              ) : (
                messages.map(m => {
                  const mine = m.senderId === user?.uid
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                    >
                      {!mine ? (
                        <p className="mb-1 text-[11px] text-gray-500">
                          {m.displayName}
                        </p>
                      ) : null}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          mine
                            ? 'bg-violet-600 text-white'
                            : 'bg-white/10 text-gray-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            mine ? 'text-white/70' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(m.createdAtMs)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="border-t border-white/10 px-3 py-3">
              <div className="flex gap-2">
                <Input
                  value={text}
                  onChange={e =>
                    setText(e.target.value.slice(0, PLACE_CHAT_MESSAGE_TEXT_MAX))
                  }
                  placeholder="Say something…"
                  className="bg-black/30"
                  maxLength={PLACE_CHAT_MESSAGE_TEXT_MAX}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!text.trim() || !ready}
                >
                  Send
                </Button>
              </div>
              {sendError ? (
                <p className="mt-2 text-xs text-red-400">{sendError}</p>
              ) : null}
              <p className="mt-2 text-[11px] text-gray-500">
                Chatting as {guestName}
                {' · '}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-gray-300"
                  onClick={() => {
                    setGuestName('')
                    setNameDraft(readStoredGuestName())
                  }}
                >
                  change name
                </button>
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
        <a href={deepLink} className="hover:text-gray-300">
          Open in {siteConfig.name}
        </a>
        <Link href="/" className="hover:text-gray-300">
          Discover more on Nessa
        </Link>
        {appStores[0] ? (
          <a
            href={appStores[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300"
          >
            Get the app
          </a>
        ) : null}
      </div>
    </section>
  )
}
