'use client'

/**
 * Guest Wi-Fi editor shared by the Business dashboard (Guest info) and the
 * Admin console (Place → Guest info). Who may save is decided by the
 * `setPlaceWifiPublic` Cloud Function: Nessa admins on any Place, and the
 * Place's business (owner, managers on assigned Places). Every change is
 * recorded in the audit log.
 */

import { useState, type FormEvent } from 'react'

import { Button, Dialog, Field, Notice, Panel, PanelFooter, PanelHeader, cx, fieldClass } from '@/components/dash/ui'
import {
  PLACE_WIFI_NETWORK_NAME_MAX,
  PLACE_WIFI_NOTE_MAX,
  PLACE_WIFI_PASSWORD_MAX,
  removePlaceWifi,
  setPlaceWifiPublic,
  SetPlaceWifiPublicError,
  type PublicPlaceWifi,
} from '@/lib/place-landing'

function errorText(err: unknown, fallback: string): string {
  return err instanceof SetPlaceWifiPublicError ? err.message : fallback
}

export function PlaceWifiPanel({
  placeId,
  initial,
  hasWifi,
  onChange,
  audience = 'business',
}: {
  placeId: string
  /** Wi-Fi as shown on the public page (null when none or hidden). */
  initial: PublicPlaceWifi | null
  /** Wi-Fi stored on the Place (may be hidden from the page). */
  hasWifi: boolean
  onChange: (hasWifi: boolean) => void
  /** Copy only: "your page" (business) or "the public page" (admin). */
  audience?: 'business' | 'admin'
}) {
  const [networkName, setNetworkName] = useState(initial?.networkName ?? '')
  const [password, setPassword] = useState(initial?.password ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'saved' | 'removed' | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const page = audience === 'admin' ? 'the public place page' : 'your public page'
  const stored = hasWifi || Boolean(initial)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nn = networkName.trim()
    const pw = password.trim()
    if (!nn) return setError('Network name is required.')
    if (!pw) return setError('Password is required.')
    setBusy('save')
    setError(null)
    setStatus(null)
    try {
      await setPlaceWifiPublic({ placeId, networkName: nn, password: pw, note: note.trim(), isPublic: true })
      setStatus('saved')
      onChange(true)
    } catch (err) {
      setError(errorText(err, 'Could not save Wi-Fi. Please try again.'))
    } finally {
      setBusy(null)
    }
  }

  const onRemove = async () => {
    setBusy('remove')
    setError(null)
    setStatus(null)
    try {
      await removePlaceWifi({ placeId })
      setNetworkName('')
      setPassword('')
      setNote('')
      setStatus('removed')
      setConfirmRemove(false)
      onChange(false)
    } catch (err) {
      setConfirmRemove(false)
      setError(errorText(err, 'Could not remove Wi-Fi. Please try again.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Panel as="form" onSubmit={(e: FormEvent) => void onSubmit(e)} aria-labelledby={`wifi-h-${placeId}`} noValidate>
      <PanelHeader
        id={`wifi-h-${placeId}`}
        icon="wifi"
        title="Guest Wi-Fi"
        description={`Shown on ${page} so guests don’t have to ask.`}
      />
      <div className="space-y-3 px-5 pb-5 max-sm:px-4">
        {hasWifi && !initial ? (
          <Notice>Wi-Fi is saved but hidden from the page. Save it again here to show it.</Notice>
        ) : null}
        <Field label="Network name">
          <input
            value={networkName}
            onChange={e => setNetworkName(e.target.value)}
            maxLength={PLACE_WIFI_NETWORK_NAME_MAX}
            autoComplete="off"
            className={fieldClass}
          />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              maxLength={PLACE_WIFI_PASSWORD_MAX}
              autoComplete="off"
              className={cx(fieldClass, 'pr-16')}
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              aria-pressed={show}
              className="absolute top-1/2 right-2 mt-0.5 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-n-muted hover:bg-n-hover hover:text-n-ink"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>
        <Field label="Note" hint="Optional — e.g. “Faster network upstairs”.">
          <input value={note} onChange={e => setNote(e.target.value)} maxLength={PLACE_WIFI_NOTE_MAX} className={fieldClass} />
        </Field>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {status === 'saved' ? <Notice tone="ok">Wi-Fi saved. It’s on {page} now.</Notice> : null}
        {status === 'removed' ? <Notice tone="ok">Wi-Fi removed from {page}.</Notice> : null}
      </div>
      <PanelFooter>
        {stored ? (
          <Button type="button" variant="quiet-danger" size="sm" onClick={() => setConfirmRemove(true)} disabled={busy !== null}>
            Remove Wi-Fi
          </Button>
        ) : (
          <span className="text-xs text-n-subtle">Visible to anyone who opens the page.</span>
        )}
        <Button type="submit" variant="primary" loading={busy === 'save'} disabled={busy === 'remove'}>
          Save Wi-Fi
        </Button>
      </PanelFooter>
      <Dialog
        open={confirmRemove}
        onClose={() => busy === null && setConfirmRemove(false)}
        title="Remove guest Wi-Fi?"
        description={`Guests will no longer see the network and password on ${page}.`}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmRemove(false)} disabled={busy === 'remove'}>
              Cancel
            </Button>
            <Button type="button" variant="danger" loading={busy === 'remove'} onClick={() => void onRemove()}>
              Remove
            </Button>
          </>
        }
      />
    </Panel>
  )
}
