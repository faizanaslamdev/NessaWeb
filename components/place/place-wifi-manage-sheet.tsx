'use client'

import { useCallback, useEffect, useState } from 'react'

import { PlaceSheet } from '@/components/place/place-sheet'
import {
  PLACE_WIFI_NETWORK_NAME_MAX,
  PLACE_WIFI_NOTE_MAX,
  PLACE_WIFI_PASSWORD_MAX,
  setPlaceWifiPublic,
  SetPlaceWifiPublicError,
  verifyPlaceWifiManagementPin,
  type PublicPlaceWifi,
} from '@/lib/place-landing'

type Step = 'pin' | 'form'

type Props = {
  open: boolean
  placeId: string
  /** Existing public wifi when editing; omit/undefined when adding. */
  initialWifi?: PublicPlaceWifi | null
  onClose: () => void
  onSaved: (wifi: PublicPlaceWifi | null) => void
}

/**
 * Temporary pilot: PIN → Wi-Fi form for public Place page.
 * TODO(business-profiles): swap PIN step for verified Business Profile auth.
 */
export function PlaceWifiManageSheet({
  open,
  placeId,
  initialWifi,
  onClose,
  onSaved,
}: Props) {
  const isEdit = Boolean(initialWifi?.networkName && initialWifi?.password)
  const [step, setStep] = useState<Step>('pin')
  const [pin, setPin] = useState('')
  const [networkName, setNetworkName] = useState('')
  const [password, setPassword] = useState('')
  const [note, setNote] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifyingPin, setVerifyingPin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setStep('pin')
    setPin('')
    setNetworkName(initialWifi?.networkName ?? '')
    setPassword(initialWifi?.password ?? '')
    setNote(initialWifi?.note ?? '')
    setIsPublic(true)
    setSaving(false)
    setVerifyingPin(false)
    setError(null)
    setSuccess(false)
  }, [open, initialWifi])

  const title =
    step === 'pin'
      ? isEdit
        ? 'Edit Wi-Fi'
        : 'Add Wi-Fi'
      : isEdit
        ? 'Edit Wi-Fi'
        : 'Add Wi-Fi'

  const onContinuePin = useCallback(async () => {
    const trimmed = pin.trim()
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Enter the 6-digit PIN.')
      return
    }
    setVerifyingPin(true)
    setError(null)
    try {
      await verifyPlaceWifiManagementPin({ placeId, pin: trimmed })
      setStep('form')
    } catch (e) {
      if (e instanceof SetPlaceWifiPublicError) {
        setError(
          e.code === 'permission-denied' ? 'Incorrect PIN.' : e.message,
        )
      } else {
        setError('Could not verify PIN. Please try again.')
      }
    } finally {
      setVerifyingPin(false)
    }
  }, [pin, placeId])

  const onSave = useCallback(async () => {
    const nn = networkName.trim()
    const pw = password.trim()
    const nt = note.trim()
    if (!nn) {
      setError('Network name is required.')
      return
    }
    if (nn.length > PLACE_WIFI_NETWORK_NAME_MAX) {
      setError(`Network name must be at most ${PLACE_WIFI_NETWORK_NAME_MAX} characters.`)
      return
    }
    if (!pw) {
      setError('Password is required.')
      return
    }
    if (pw.length > PLACE_WIFI_PASSWORD_MAX) {
      setError(`Password must be at most ${PLACE_WIFI_PASSWORD_MAX} characters.`)
      return
    }
    if (nt.length > PLACE_WIFI_NOTE_MAX) {
      setError(`Note must be at most ${PLACE_WIFI_NOTE_MAX} characters.`)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const wifi = await setPlaceWifiPublic({
        placeId,
        pin: pin.trim(),
        networkName: nn,
        password: pw,
        note: nt,
        isPublic,
      })
      setSuccess(true)
      onSaved(wifi)
      window.setTimeout(() => {
        onClose()
      }, 700)
    } catch (e) {
      if (e instanceof SetPlaceWifiPublicError) {
        if (e.code === 'permission-denied') {
          setStep('pin')
          setError('Incorrect PIN.')
        } else {
          setError(e.message)
        }
      } else {
        setError('Could not save Wi-Fi. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }, [
    networkName,
    password,
    note,
    placeId,
    pin,
    isPublic,
    onSaved,
    onClose,
  ])

  return (
    <PlaceSheet
      open={open}
      title={title}
      onClose={onClose}
      footer={
        step === 'pin' ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onContinuePin()}
              disabled={verifyingPin}
              className="flex-1 rounded-xl bg-[#8B5CF6] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50"
            >
              {verifyingPin ? 'Checking…' : 'Continue'}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || success}
              className="flex-1 rounded-xl bg-[#8B5CF6] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50"
            >
              {saving ? 'Saving…' : success ? 'Saved' : 'Save'}
            </button>
          </div>
        )
      }
    >
      {step === 'pin' ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-gray-400">
            Enter the temporary management PIN to{' '}
            {isEdit ? 'update' : 'add'} Wi-Fi for this place.
          </p>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              PIN
            </span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={pin}
              onChange={e => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                setError(null)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  void onContinuePin()
                }
              }}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center text-lg tracking-[0.35em] text-white outline-none focus:border-violet-400/60"
              placeholder="••••••"
              aria-label="Management PIN"
            />
          </label>
          {error ? (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Network name
            </span>
            <input
              type="text"
              value={networkName}
              maxLength={PLACE_WIFI_NETWORK_NAME_MAX}
              onChange={e => {
                setNetworkName(e.target.value)
                setError(null)
              }}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/60"
              placeholder="Guest Wi-Fi"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Password
            </span>
            <input
              type="text"
              value={password}
              maxLength={PLACE_WIFI_PASSWORD_MAX}
              onChange={e => {
                setPassword(e.target.value)
                setError(null)
              }}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/60"
              placeholder="Password"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Note <span className="font-normal normal-case">(optional)</span>
            </span>
            <textarea
              value={note}
              maxLength={PLACE_WIFI_NOTE_MAX}
              rows={2}
              onChange={e => {
                setNote(e.target.value)
                setError(null)
              }}
              className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/60"
              placeholder="Ask staff if the password changes"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <span className="text-sm text-gray-200">Show on public Place page</span>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="size-4 accent-[#8B5CF6]"
            />
          </label>
          {error ? (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-emerald-300" role="status">
              Wi-Fi saved.
            </p>
          ) : null}
        </div>
      )}
    </PlaceSheet>
  )
}
