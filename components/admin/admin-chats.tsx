'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'

import {
  accountButtonClass,
  accountCardClass,
  accountFieldClass,
} from '@/components/account/account-shell'
import { AdminActionError } from '@/lib/admin'
import {
  ADMIN_RETENTION_OPTIONS,
  RETENTION_OPTION_LABELS,
  describeChatAuditEntry,
  getAdminPlaceChatRoom,
  listPlaceChatAudit,
  parsePlaceRef,
  resolvePlaceRef,
  setPlaceChatRetention,
  type AdminPlaceChatRoom,
  type PlaceChatAuditEntry,
} from '@/lib/admin-chats'
import {
  PLACE_CHAT_DEFAULT_RETENTION_HOURS,
  placeChatRetentionLabel,
  type PlaceChatRetentionHours,
} from '@/lib/place-chat/retention'
import { placeCanonicalPath, placeChatCanonicalPath, placeChatLegacyPath } from '@/lib/place-slug'

type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; audit: PlaceChatAuditEntry[] }
  | { kind: 'denied'; message: string }
  | { kind: 'error'; message: string }

type Notice = { kind: 'ok' | 'error'; text: string }

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function errorText(e: unknown, fallback: string): string {
  return e instanceof AdminActionError ? e.message : fallback
}

function isAccessError(e: unknown): boolean {
  const code = e instanceof AdminActionError ? e.code : ''
  return code.includes('permission-denied') || code.includes('unauthenticated') || code.includes('email-not-verified')
}

/**
 * Admin page for Place Chat rooms: find a room by Place ID or Nessa link and
 * set how long its messages stay (24h default; 3 / 7 / 30 days). Every
 * action goes through the `managePlaceChat` callable, which checks the
 * admin role server-side and writes the audit entry.
 */
export function AdminChats() {
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [notice, setNotice] = useState<Notice | null>(null)
  const [room, setRoom] = useState<AdminPlaceChatRoom | null>(null)

  const loadAudit = useCallback(async () => {
    try {
      const audit = await listPlaceChatAudit(50)
      setState({ kind: 'ready', audit })
    } catch (e) {
      setState(
        isAccessError(e)
          ? { kind: 'denied', message: errorText(e, 'Only Nessa admins can manage chats.') }
          : { kind: 'error', message: errorText(e, 'Could not load chat settings.') },
      )
    }
  }, [])

  useEffect(() => {
    // Initial load; setState happens after the async call resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAudit()
  }, [loadAudit])

  const openRoom = useCallback(async (placeId: string) => {
    setNotice(null)
    try {
      setRoom(await getAdminPlaceChatRoom(placeId))
    } catch (e) {
      setRoom(null)
      setNotice({ kind: 'error', text: errorText(e, 'Could not load this chat.') })
    }
  }, [])

  if (state.kind === 'loading') return <p className="text-center text-sm text-gray-400">Loading…</p>
  if (state.kind === 'denied' || state.kind === 'error') {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p className={`text-sm ${state.kind === 'denied' ? 'text-gray-300' : 'text-red-300'}`}>{state.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`text-center text-sm ${notice.kind === 'ok' ? 'text-emerald-300' : 'text-red-400'}`}
        >
          {notice.text}
        </p>
      ) : null}

      <FindRoomForm onFound={openRoom} onError={text => setNotice({ kind: 'error', text })} />

      {room ? (
        <RoomCard
          key={`${room.placeId}:${room.messageRetentionHours}`}
          room={room}
          onSaved={async (updated, previousHours) => {
            setRoom(updated)
            setNotice({
              kind: 'ok',
              text: `${updated.title}: messages now last ${placeChatRetentionLabel(
                updated.messageRetentionHours,
              )} (was ${placeChatRetentionLabel(previousHours)}).`,
            })
            await loadAudit()
          }}
        />
      ) : null}

      <section aria-label="Chat settings changes" className={accountCardClass}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent changes</p>
        {state.audit.length === 0 ? (
          <p className="text-xs text-gray-500">No chat settings changed yet. Every chat uses 24 hours.</p>
        ) : (
          <ul className="space-y-1.5">
            {state.audit.map(entry => (
              <li key={entry.id} className="text-xs leading-5 text-gray-300">
                <span className="text-gray-500">{formatDate(entry.at)} · </span>
                <button
                  type="button"
                  onClick={() => void openRoom(entry.targetId)}
                  className="text-left hover:text-white hover:underline"
                >
                  {describeChatAuditEntry(entry)}
                </button>
                {entry.note ? <span className="text-gray-500"> — “{entry.note}”</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function FindRoomForm({
  onFound,
  onError,
}: {
  onFound: (placeId: string) => Promise<void>
  onError: (text: string) => void
}) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const ref = parsePlaceRef(value)
    if (!ref) {
      onError('Paste a Google Place ID (ChIJ…) or a Nessa Place / Place Chat link.')
      return
    }
    setBusy(true)
    try {
      const placeId = await resolvePlaceRef(ref)
      if (!placeId) {
        onError('No Nessa Place uses that link.')
        return
      }
      await onFound(placeId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={e => void onSubmit(e)} className={accountCardClass} noValidate aria-label="Find a Place Chat">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Find a Place Chat</p>
      <label className="block text-left text-xs text-gray-400">
        Place ID or Nessa link
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="ChIJ… or https://www.nessachat.com/places/…"
          autoComplete="off"
          className={accountFieldClass}
        />
      </label>
      <button type="submit" disabled={busy || !value.trim()} className={accountButtonClass}>
        {busy ? 'Looking…' : 'Open chat settings'}
      </button>
    </form>
  )
}

function RoomCard({
  room,
  onSaved,
}: {
  room: AdminPlaceChatRoom
  onSaved: (room: AdminPlaceChatRoom, previousHours: number) => Promise<void>
}) {
  const [hours, setHours] = useState<PlaceChatRetentionHours>(room.messageRetentionHours)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changed = hours !== room.messageRetentionHours
  const placeHref = room.slug ? placeCanonicalPath(room.slug) : `/place/${encodeURIComponent(room.placeId)}`

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!changed) return
    setError(null)
    setBusy(true)
    try {
      const updated = await setPlaceChatRetention(room.placeId, hours, note)
      await onSaved(updated, room.messageRetentionHours)
    } catch (e) {
      setError(errorText(e, 'Could not save. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={e => void onSubmit(e)}
      className={accountCardClass}
      aria-label={`Settings for ${room.title}`}
      data-place-id={room.placeId}
    >
      <div>
        <p className="text-base font-semibold text-white">{room.title}</p>
        <p className="text-[11px] text-gray-500">
          {[room.placeName, room.city].filter(Boolean).join(' · ') || 'Place'} · {room.placeId}
        </p>
        <p className="mt-1 flex gap-3 text-[11px]">
          <a href={placeHref} target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">
            Place page
          </a>
          <a
            href={room.slug ? placeChatCanonicalPath(room.slug) : placeChatLegacyPath(room.placeId)}
            target="_blank"
            rel="noreferrer"
            className="text-violet-300 hover:underline"
          >
            Open chat
          </a>
        </p>
      </div>

      <p className="text-sm text-gray-200" data-testid="current-retention">
        Messages currently last <strong>{placeChatRetentionLabel(room.messageRetentionHours)}</strong>
        {room.retentionIsDefault ? ' (default)' : ''}.
        {room.retentionUpdatedAt ? (
          <span className="block text-[11px] text-gray-500">
            Changed {formatDate(room.retentionUpdatedAt)}
            {room.retentionUpdatedByEmail ? ` by ${room.retentionUpdatedByEmail}` : ''}
          </span>
        ) : null}
        {!room.roomExists ? (
          <span className="block text-[11px] text-gray-500">Nobody has chatted here yet.</span>
        ) : null}
      </p>

      <fieldset className="text-left">
        <legend className="text-xs text-gray-400">Keep messages for</legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {ADMIN_RETENTION_OPTIONS.map(h => (
            <label
              key={h}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                hours === h ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-white/10 bg-black/30 text-gray-300'
              }`}
            >
              <input
                type="radio"
                name="retention-hours"
                value={h}
                checked={hours === h}
                onChange={() => setHours(h)}
                className="accent-violet-500"
              />
              {RETENTION_OPTION_LABELS[h]}
            </label>
          ))}
        </div>
      </fieldset>

      <ul className="list-disc space-y-1 pl-4 text-[11px] leading-4 text-gray-500">
        <li>Applies to messages sent from now on. Messages already sent keep their current expiry.</li>
        <li>Other Place Chats are not affected.</li>
        {hours > PLACE_CHAT_DEFAULT_RETENTION_HOURS ? (
          <li>
            The web chat shows the new duration. The installed app keeps messages for the new duration but its
            text still says “24 hours” until the next app update.
          </li>
        ) : null}
      </ul>

      <label className="block text-left text-xs text-gray-400">
        Note (optional, kept in the audit log)
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} className={accountFieldClass} />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy || !changed} className={accountButtonClass}>
        {busy ? 'Saving…' : changed ? `Keep messages for ${placeChatRetentionLabel(hours)}` : 'No change'}
      </button>
    </form>
  )
}
