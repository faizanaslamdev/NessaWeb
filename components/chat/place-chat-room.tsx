'use client'

/**
 * Place Chat room shell — same fixed full-screen Instant Chat layout,
 * Place Chat data adapter (ensure room + guest name + Place messages).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import AuthErrorPanel from '@/components/chat/auth-error-panel'
import ChatHeader from '@/components/chat/chat-header'
import EntryModal from '@/components/chat/entry-modal'
import ParticipantsSheet from '@/components/chat/participants-sheet'
import ParticipantsSidebar from '@/components/chat/participants-sidebar'
import PlaceChatThread from '@/components/chat/place-chat-thread'
import { Button } from '@/components/ui/button'
import { useInstantAuth } from '@/hooks/use-instant-auth'
import {
  useInstantPresenceTracking,
  usePresenceByUserIds,
} from '@/hooks/use-presence-web'
import { useWebUiLocale } from '@/hooks/use-web-ui-locale'
import { DEFAULT_CHAT_LANGUAGE_CODE } from '@/lib/chat/languages'
import { getFirebaseClient } from '@/lib/firebase'
import {
  ensurePlaceChatRoom,
  setPlaceChatViewerLanguage,
  subscribePlaceChatViewers,
} from '@/lib/place-chat/api'
import {
  PLACE_CHAT_GUEST_NAME_KEY,
  PLACE_CHAT_VIEWER_HEARTBEAT_MS,
  buildPlaceChatTitle,
} from '@/lib/place-chat/constants'
import { normalizePlaceChatLanguage } from '@/lib/place-chat/translation'
import type { PlaceChatViewerPref } from '@/lib/place-chat/viewers'
import type { ChatParticipant } from '@/components/chat/participants-list'
import { writeStoredWebUiLanguage } from '@/lib/web-ui-locale'

type PlaceChatRoomProps = {
  placeId: string
}

function readStoredGuestName(): string {
  if (typeof window === 'undefined') return ''
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

export default function PlaceChatRoom({ placeId }: PlaceChatRoomProps) {
  const searchParams = useSearchParams()
  const placeNameHint =
    searchParams.get('placeName')?.trim() ||
    searchParams.get('name')?.trim() ||
    null

  const {
    language: uiLanguage,
    setLanguage: setUiLanguage,
    ready: localeReady,
    copy,
  } = useWebUiLocale()
  const { user, loading: authLoading, error: authError } = useInstantAuth()
  const [title, setTitle] = useState(() => buildPlaceChatTitle(placeNameHint))
  const [roomReady, setRoomReady] = useState(false)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestLanguage, setGuestLanguage] = useState(DEFAULT_CHAT_LANGUAGE_CODE)
  const [hydratedGuest, setHydratedGuest] = useState(false)
  const [viewers, setViewers] = useState<PlaceChatViewerPref[]>([])
  const [showParticipantsSheet, setShowParticipantsSheet] = useState(false)
  const [copyNotice, setCopyNotice] = useState<null | {
    kind: 'success' | 'error'
    text: string
  }>(null)

  const showNotice = useCallback((kind: 'success' | 'error', text: string) => {
    setCopyNotice({ kind, text })
    setTimeout(() => setCopyNotice(null), 1800)
  }, [])

  const placeHref = `/place/${encodeURIComponent(placeId)}`
  const inRoom = Boolean(user && roomReady && guestName)

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

  useEffect(() => {
    if (!localeReady || hydratedGuest) return
    queueMicrotask(() => {
      setGuestName(readStoredGuestName())
      setGuestLanguage(normalizePlaceChatLanguage(uiLanguage))
      setHydratedGuest(true)
    })
  }, [localeReady, uiLanguage, hydratedGuest])

  useEffect(() => {
    if (authLoading || authError || !user) return
    let cancelled = false
    const { firestore } = getFirebaseClient()
    void ensurePlaceChatRoom(firestore, {
      placeId,
      placeName: placeNameHint,
    })
      .then(room => {
        if (cancelled) return
        setTitle(room.title)
        setRoomReady(true)
        setRoomError(null)
      })
      .catch(e => {
        if (cancelled) return
        setRoomError(
          e instanceof Error ? e.message : copy.couldNotOpenPlaceChat,
        )
        setRoomReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, authError, user, placeId, placeNameHint, copy.couldNotOpenPlaceChat])

  // viewer_prefs = Instant-analog of session.members (language + displayName).
  useEffect(() => {
    if (!user || !guestName || !roomReady) return
    const { firestore } = getFirebaseClient()
    const writePrefs = () =>
      setPlaceChatViewerLanguage(firestore, {
        placeId,
        uid: user.uid,
        language: guestLanguage,
        displayName: guestName,
      }).catch(() => {
        // Non-fatal
      })
    writePrefs()
    const interval = window.setInterval(writePrefs, PLACE_CHAT_VIEWER_HEARTBEAT_MS)
    return () => window.clearInterval(interval)
  }, [user, guestName, guestLanguage, placeId, roomReady])

  useEffect(() => {
    if (!inRoom) {
      setViewers([])
      return
    }
    const { firestore } = getFirebaseClient()
    return subscribePlaceChatViewers(firestore, placeId, setViewers)
  }, [inRoom, placeId])

  useInstantPresenceTracking(user?.uid, inRoom)

  const viewerUids = useMemo(() => viewers.map(v => v.uid), [viewers])
  const presenceByUser = usePresenceByUserIds(viewerUids)

  const participants: ChatParticipant[] = useMemo(
    () =>
      viewers.map(v => ({
        id: v.uid,
        name: v.displayName || 'Traveler',
        avatar: (v.displayName || 'T')[0]?.toUpperCase() ?? '?',
        isOnline: presenceByUser[v.uid]?.state === 'online',
      })),
    [viewers, presenceByUser],
  )

  const onlineCount = participants.filter(p => p.isOnline).length

  const handleJoin = (data: { name: string; language: string }) => {
    const name = data.name.trim()
    if (!name) return
    const language = normalizePlaceChatLanguage(
      data.language || DEFAULT_CHAT_LANGUAGE_CODE,
    )
    storeGuestName(name)
    writeStoredWebUiLanguage(language)
    setUiLanguage(language)
    setGuestName(name)
    setGuestLanguage(language)
  }

  if (authError) {
    return <AuthErrorPanel authError={authError} />
  }

  if (
    !localeReady ||
    authLoading ||
    !hydratedGuest ||
    (user && !roomReady && !roomError)
  ) {
    return (
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-black text-gray-400">
        {copy.loading}
      </div>
    )
  }

  if (roomError) {
    return (
      <div className="fixed inset-0 z-0 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-gray-300">{roomError}</p>
        <Button asChild className="bg-purple-600 text-white hover:bg-purple-700">
          <Link href={placeHref}>{copy.backToPlace}</Link>
        </Button>
      </div>
    )
  }

  const entryOpen = Boolean(user && roomReady && !guestName)
  const metaLine = `${copy.livePlaceChat} · ${onlineCount} ${copy.online} · ${copy.messagesLast24h}`

  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden bg-black">
      {copyNotice ? (
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
      ) : null}

      <EntryModal
        roomId={placeId}
        isOpen={entryOpen}
        variant="join"
        initialLanguage={guestLanguage}
        joinCopy={{
          joinConversation: copy.joinConversation,
          enterDetails: copy.enterDetails,
          yourName: copy.yourName,
          namePlaceholder: copy.namePlaceholder,
          preferredLanguage: copy.preferredLanguage,
          enterChat: copy.enterChat,
          back: copy.back,
          noSignup: copy.noSignup,
        }}
        onClose={() => {
          window.location.href = placeHref
        }}
        onJoin={handleJoin}
      />

      {!entryOpen && user && guestName ? (
        <>
          <ChatHeader
            roomId={placeId}
            participantCount={onlineCount}
            title={title}
            titleHref={placeHref}
            metaLine={metaLine}
            hideOnlineCount
            hideShare
            hideSettings
            participantsTitle={copy.peopleInRoom}
            onOpenParticipants={() => setShowParticipantsSheet(true)}
            onRoomIdCopied={ok =>
              showNotice(
                ok ? 'success' : 'error',
                ok ? copy.placeIdCopied : copy.copyBlocked,
              )
            }
          />

          <ParticipantsSheet
            open={showParticipantsSheet}
            onClose={() => setShowParticipantsSheet(false)}
            participants={participants}
            title={copy.peopleInRoom}
            doneLabel={copy.done}
            emptyLabel={copy.noOneHereYet}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <PlaceChatThread
              placeId={placeId}
              placeName={placeNameHint}
              user={user}
              displayName={guestName}
              preferredLanguage={guestLanguage}
              copy={copy}
              onSendError={msg => showNotice('error', msg)}
            />
            <ParticipantsSidebar
              participants={participants}
              title={copy.participants(participants.length)}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
