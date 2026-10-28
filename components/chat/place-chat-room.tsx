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
import { PlaceChatJoinTracker } from '@/components/chat/place-chat-join-tracker'
import PlaceChatThread from '@/components/chat/place-chat-thread'
import { Button } from '@/components/ui/button'
import { useInstantAuth } from '@/hooks/use-instant-auth'
import {
  useInstantPresenceTracking,
  usePresenceByUserIds,
} from '@/hooks/use-presence-web'
import { DEFAULT_CHAT_LANGUAGE_CODE } from '@/lib/chat/languages'
import { getFirebaseClient } from '@/lib/firebase'
import {
  ensurePlaceChatRoom,
  setPlaceChatViewerLanguage,
  subscribePlaceChatRoom,
  subscribePlaceChatViewers,
} from '@/lib/place-chat/api'
import {
  PLACE_CHAT_VIEWER_HEARTBEAT_MS,
  buildPlaceChatTitle,
} from '@/lib/place-chat/constants'
import {
  persistPlaceChatGuestProfile,
  readStoredGuestLanguage,
  readStoredGuestName,
} from '@/lib/place-chat/guest-profile'
import {
  PLACE_CHAT_DEFAULT_RETENTION_HOURS,
  placeChatRetentionLabel,
} from '@/lib/place-chat/retention'
import type { PlaceChatViewerPref } from '@/lib/place-chat/viewers'
import type { ChatParticipant } from '@/components/chat/participants-list'

type PlaceChatRoomProps = {
  placeId: string
  /** Canonical slug when known (`/places/{slug}/chat`); back-links use it. */
  slug?: string | null
  /** Server-known Place name (slug route); query hints still work. */
  placeName?: string | null
}

export default function PlaceChatRoom({ placeId, slug, placeName }: PlaceChatRoomProps) {
  const searchParams = useSearchParams()
  const placeNameHint =
    placeName?.trim() ||
    searchParams.get('placeName')?.trim() ||
    searchParams.get('name')?.trim() ||
    null

  const { user, loading: authLoading, error: authError } = useInstantAuth()
  const [title, setTitle] = useState(() => buildPlaceChatTitle(placeNameHint))
  const [roomReady, setRoomReady] = useState(false)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestLanguage, setGuestLanguage] = useState(DEFAULT_CHAT_LANGUAGE_CODE)
  const [hydratedGuest, setHydratedGuest] = useState(false)
  const [viewers, setViewers] = useState<PlaceChatViewerPref[]>([])
  const [retentionHours, setRetentionHours] = useState<number>(PLACE_CHAT_DEFAULT_RETENTION_HOURS)
  const [showParticipantsSheet, setShowParticipantsSheet] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [copyNotice, setCopyNotice] = useState<null | {
    kind: 'success' | 'error'
    text: string
  }>(null)

  const showNotice = useCallback((kind: 'success' | 'error', text: string) => {
    setCopyNotice({ kind, text })
    setTimeout(() => setCopyNotice(null), 1800)
  }, [])

  const placeHref = slug ? `/places/${slug}` : `/place/${encodeURIComponent(placeId)}`
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
    queueMicrotask(() => {
      setGuestName(readStoredGuestName())
      setGuestLanguage(readStoredGuestLanguage())
      setHydratedGuest(true)
    })
  }, [])

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
        setRoomError(e instanceof Error ? e.message : 'Could not open Place Chat')
        setRoomReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, authError, user, placeId, placeNameHint])

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
    if (!inRoom) return
    const { firestore } = getFirebaseClient()
    return subscribePlaceChatViewers(firestore, placeId, setViewers)
  }, [inRoom, placeId])

  // Header copy follows the room's admin-managed retention (24h default).
  useEffect(() => {
    if (!roomReady) return
    const { firestore } = getFirebaseClient()
    return subscribePlaceChatRoom(firestore, placeId, info => setRetentionHours(info.retentionHours))
  }, [roomReady, placeId])

  useInstantPresenceTracking(user?.uid, inRoom)

  const viewerUids = useMemo(() => viewers.map(v => v.uid), [viewers])
  const presenceByUser = usePresenceByUserIds(viewerUids)

  const participants: ChatParticipant[] = useMemo(
    () =>
      inRoom
        ? viewers.map(v => ({
            id: v.uid,
            name: v.displayName || 'Traveler',
            avatar: (v.displayName || 'T')[0]?.toUpperCase() ?? '?',
            isOnline: presenceByUser[v.uid]?.state === 'online',
          }))
        : [],
    [inRoom, viewers, presenceByUser],
  )

  const onlineCount = participants.filter(p => p.isOnline).length

  const handleJoin = (data: { name: string; language: string }) => {
    const saved = persistPlaceChatGuestProfile(data.name, data.language)
    if (!saved) return
    setGuestName(saved.displayName)
    setGuestLanguage(saved.language)
  }

  const handleSaveProfile = useCallback(
    async (data: { name: string; language: string }) => {
      const saved = persistPlaceChatGuestProfile(data.name, data.language)
      if (!saved || !user) return
      setGuestName(saved.displayName)
      setGuestLanguage(saved.language)
      setShowProfileSettings(false)
      try {
        const { firestore } = getFirebaseClient()
        await setPlaceChatViewerLanguage(firestore, {
          placeId,
          uid: user.uid,
          language: saved.language,
          displayName: saved.displayName,
        })
        showNotice('success', 'Profile updated')
      } catch {
        showNotice('error', 'Could not save profile — try again')
      }
    },
    [placeId, showNotice, user],
  )

  // Attribution + join counting (renders nothing). Placed before the early
  // returns so tracking params are read and stripped as soon as the page opens.
  const joinTracker = <PlaceChatJoinTracker placeId={placeId} joined={inRoom} />

  if (authError) {
    return (
      <>
        {joinTracker}
        <AuthErrorPanel authError={authError} />
      </>
    )
  }

  if (authLoading || !hydratedGuest || (user && !roomReady && !roomError)) {
    return (
      <>
        {joinTracker}
        <div className="fixed inset-0 z-0 flex items-center justify-center bg-n-canvas text-n-muted">
          Loading…
        </div>
      </>
    )
  }

  if (roomError) {
    return (
      <div className="fixed inset-0 z-0 flex flex-col items-center justify-center gap-4 bg-n-canvas px-6 text-center">
        <p className="text-n-ink-2">{roomError}</p>
        <Button asChild className="bg-n-accent text-white hover:bg-n-accent-strong">
          <Link href={placeHref}>Back to place</Link>
        </Button>
      </div>
    )
  }

  const entryOpen = Boolean(user && roomReady && !guestName)

  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden bg-n-canvas">
      {joinTracker}
      {copyNotice ? (
        <div className="fixed top-4 right-4 z-120 max-w-[min(calc(100vw-2rem),20rem)]">
          <div
            className={[
              'rounded-xl border px-4 py-2 text-sm backdrop-blur-md',
              copyNotice.kind === 'success'
                ? 'border-n-line bg-n-surface text-n-ink shadow-n-card'
                : 'border-n-danger/30 bg-n-danger-soft text-n-danger',
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
        onClose={() => {
          window.location.href = placeHref
        }}
        onJoin={handleJoin}
      />

      <EntryModal
        roomId={placeId}
        isOpen={showProfileSettings}
        variant="edit-profile"
        initialName={guestName}
        initialLanguage={guestLanguage}
        onClose={() => setShowProfileSettings(false)}
        onSave={data => {
          void handleSaveProfile(data)
        }}
      />

      {!entryOpen && user && guestName ? (
        <>
          <ChatHeader
            roomId={placeId}
            participantCount={onlineCount}
            title={title}
            titleHref={placeHref}
            metaLine={`Live Place Chat · ${onlineCount} online · messages last ${placeChatRetentionLabel(retentionHours)}`}
            hideOnlineCount
            hideShare
            onSettings={() => {
              setShowParticipantsSheet(false)
              setShowProfileSettings(true)
            }}
            onOpenParticipants={() => setShowParticipantsSheet(true)}
            onRoomIdCopied={ok =>
              showNotice(
                ok ? 'success' : 'error',
                ok ? 'Place ID copied' : 'Copy blocked by browser',
              )
            }
          />

          <ParticipantsSheet
            open={showParticipantsSheet}
            onClose={() => setShowParticipantsSheet(false)}
            participants={participants}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <PlaceChatThread
              placeId={placeId}
              placeName={placeNameHint}
              user={user}
              displayName={guestName}
              preferredLanguage={guestLanguage}
              onSendError={msg => showNotice('error', msg)}
            />
            <ParticipantsSidebar participants={participants} />
          </div>
        </>
      ) : null}
    </div>
  )
}
