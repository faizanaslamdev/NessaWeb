'use client'

/**
 * Admin: how long a Place Chat keeps messages (24h default; 3 / 7 / 30
 * days). Saved through `managePlaceChat`, which checks the admin role and
 * writes the audit entry.
 */

import { useEffect, useState, type FormEvent } from 'react'

import { Icon } from '@/components/dash/icons'
import { Badge, Button, Field, LoadingBlock, Notice, Panel, PanelFooter, PanelHeader, cx, fieldClass, formatDateTime } from '@/components/dash/ui'
import { AdminActionError } from '@/lib/admin'
import {
  ADMIN_RETENTION_OPTIONS,
  getAdminPlaceChatRoom,
  setPlaceChatRetention,
  type AdminPlaceChatRoom,
} from '@/lib/admin-chats'
import {
  PLACE_CHAT_DEFAULT_RETENTION_HOURS,
  placeChatRetentionLabel,
  type PlaceChatRetentionHours,
} from '@/lib/place-chat/retention'

const OPTION_TEXT: Record<PlaceChatRetentionHours, { title: string; hint: string }> = {
  24: { title: '24 hours', hint: 'Default' },
  72: { title: '3 days', hint: 'Short stays' },
  168: { title: '7 days', hint: 'Towns, events' },
  720: { title: '30 days', hint: 'Long stays' },
}

export function ChatRetentionPanel({ placeId, onSaved }: { placeId: string; onSaved?: () => void }) {
  const [room, setRoom] = useState<AdminPlaceChatRoom | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hours, setHours] = useState<PlaceChatRetentionHours>(24)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAdminPlaceChatRoom(placeId)
      .then(r => {
        if (cancelled) return
        setRoom(r)
        setHours(r.messageRetentionHours)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof AdminActionError ? e.message : 'Could not load the chat settings.')
      })
    return () => {
      cancelled = true
    }
  }, [placeId])

  const changed = room ? hours !== room.messageRetentionHours : false

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!room || !changed) return
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      const previous = room.messageRetentionHours
      const updated = await setPlaceChatRetention(room.placeId, hours, note)
      setRoom(updated)
      setHours(updated.messageRetentionHours)
      setNote('')
      setSaved(
        `Messages now last ${placeChatRetentionLabel(updated.messageRetentionHours)} (was ${placeChatRetentionLabel(previous)}).`,
      )
      onSaved?.()
    } catch (err) {
      setError(err instanceof AdminActionError ? err.message : 'Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel as="form" onSubmit={(e: FormEvent) => void onSubmit(e)} aria-labelledby="retention-h" data-place-id={placeId}>
      <PanelHeader
        id="retention-h"
        icon="clock"
        title="Message history"
        description="How long messages stay in this place’s live chat."
        actions={
          room ? (
            <Badge tone={room.retentionIsDefault ? 'neutral' : 'accent'}>
              <span data-testid="current-retention">{placeChatRetentionLabel(room.messageRetentionHours)}</span>
              {room.retentionIsDefault ? ' · default' : ''}
            </Badge>
          ) : null
        }
      />
      {!room && !error ? (
        <LoadingBlock rows={2} />
      ) : !room ? (
        <div className="px-5 pb-5">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : (
        <>
          <div className="space-y-4 px-5 pb-5 max-sm:px-4">
            <fieldset>
              <legend className="sr-only">Keep messages for</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ADMIN_RETENTION_OPTIONS.map(h => (
                  <label
                    key={h}
                    className={cx(
                      'relative flex cursor-pointer flex-col rounded-[10px] border px-3 py-2.5 transition-colors',
                      hours === h
                        ? 'border-n-accent bg-n-accent-soft ring-1 ring-n-accent'
                        : 'border-n-line-strong bg-n-surface hover:border-n-faint',
                    )}
                  >
                    <input
                      type="radio"
                      name={`retention-${placeId}`}
                      value={h}
                      checked={hours === h}
                      onChange={() => setHours(h)}
                      className="sr-only"
                    />
                    <span className={cx('text-sm font-semibold', hours === h ? 'text-n-accent-strong' : 'text-n-ink')}>
                      {OPTION_TEXT[h].title}
                    </span>
                    <span className="text-xs text-n-muted">{OPTION_TEXT[h].hint}</span>
                    {room.messageRetentionHours === h ? (
                      <span className="absolute top-2 right-2 text-n-accent" title="Current">
                        <Icon name="check" size={14} />
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            </fieldset>
            <ul className="space-y-1 text-[13px] leading-5 text-n-muted">
              <li>Applies to messages sent from now on; older messages keep their expiry. Other chats are not affected.</li>
              {hours > PLACE_CHAT_DEFAULT_RETENTION_HOURS ? (
                <li>The installed app keeps messages for the new duration, but its text says “24 hours” until the next app update.</li>
              ) : null}
            </ul>
            {changed ? (
              <Field label="Note (optional)" hint="Kept in the audit log.">
                <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} className={fieldClass} />
              </Field>
            ) : null}
            {error ? <Notice tone="danger">{error}</Notice> : null}
            {saved ? <Notice tone="ok">{saved}</Notice> : null}
          </div>
          <PanelFooter>
            <p className="text-xs text-n-subtle">
              {room.retentionUpdatedAt
                ? `Changed ${formatDateTime(room.retentionUpdatedAt)}${room.retentionUpdatedByEmail ? ` by ${room.retentionUpdatedByEmail}` : ''}`
                : room.roomExists
                  ? 'Never changed'
                  : 'Nobody has chatted here yet'}
            </p>
            <Button type="submit" variant="primary" loading={busy} disabled={!changed}>
              {changed ? `Keep messages ${placeChatRetentionLabel(hours)}` : 'No changes'}
            </Button>
          </PanelFooter>
        </>
      )}
    </Panel>
  )
}
