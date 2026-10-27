'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'

import {
  accountButtonClass,
  accountCardClass,
  accountFieldClass,
} from '@/components/account/account-shell'
import { accountRoutes } from '@/lib/account/constants'
import { BusinessActionError, requestPlaceClaim } from '@/lib/business'
import { fetchPublicPlaceLanding, type PublicPlaceLanding } from '@/lib/place-landing'

export function ClaimForm({ placeId }: { placeId: string }) {
  const [place, setPlace] = useState<PublicPlaceLanding | null>(null)
  const [placeState, setPlaceState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [role, setRole] = useState<'owner' | 'manager'>('owner')
  const [businessName, setBusinessName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchPublicPlaceLanding(placeId)
      .then(p => {
        if (cancelled) return
        setPlace(p)
        setBusinessName(current => current || p.name)
        setPlaceState('ready')
      })
      .catch(() => {
        if (!cancelled) setPlaceState('error')
      })
    return () => {
      cancelled = true
    }
  }, [placeId])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!businessName.trim()) {
      setError('Enter the business name.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await requestPlaceClaim({
        placeId,
        role,
        businessName: businessName.trim(),
        ...(contactPhone.trim() ? { contactPhone: contactPhone.trim() } : {}),
        ...(website.trim() ? { website: website.trim() } : {}),
        ...(message.trim() ? { message: message.trim() } : {}),
      })
      setDone(true)
    } catch (e) {
      setError(e instanceof BusinessActionError ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (placeState === 'error') {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p className="text-sm text-gray-300">We couldn’t load this place.</p>
      </div>
    )
  }

  if (place?.business) {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p className="text-sm text-gray-200">
          <span className="text-white">{place.name}</span> is already managed by a verified business.
        </p>
        <p className="text-xs text-gray-500">
          If that’s wrong, email support and we’ll sort it out.
        </p>
      </div>
    )
  }

  if (done) {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p className="text-sm text-gray-200">Request sent. We’ll review it and email you.</p>
        <p className="text-xs text-gray-500">Nessa verifies every claim by hand before it goes live.</p>
        <Link href={accountRoutes.business} className="block text-sm text-violet-400 hover:text-violet-300">
          Back to your business
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={accountCardClass} noValidate>
      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
        <p className="text-xs text-gray-500">Place</p>
        <p className="text-sm font-semibold text-white">{place?.name ?? 'Loading…'}</p>
        {place?.city ? <p className="text-xs text-gray-400">{[place.city, place.country].filter(Boolean).join(', ')}</p> : null}
      </div>
      <fieldset className="text-left">
        <legend className="text-xs text-gray-400">Your role</legend>
        <div className="mt-1 flex gap-2">
          {(['owner', 'manager'] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-pressed={role === r}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                role === r ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {r === 'owner' ? 'Owner' : 'Manager'}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-left text-xs text-gray-400">
        Business name
        <input value={businessName} onChange={e => setBusinessName(e.target.value)} className={accountFieldClass} maxLength={80} required />
      </label>
      <label className="block text-left text-xs text-gray-400">
        Phone or WhatsApp (optional)
        <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={accountFieldClass} inputMode="tel" maxLength={32} />
      </label>
      <label className="block text-left text-xs text-gray-400">
        Website (optional)
        <input value={website} onChange={e => setWebsite(e.target.value)} className={accountFieldClass} inputMode="url" maxLength={300} />
      </label>
      <label className="block text-left text-xs text-gray-400">
        Anything that helps us verify you (optional)
        <textarea value={message} onChange={e => setMessage(e.target.value)} className={`${accountFieldClass} min-h-20`} maxLength={500} />
      </label>
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      <button type="submit" disabled={busy || placeState !== 'ready'} className={accountButtonClass}>
        {busy ? 'Sending…' : 'Send claim request'}
      </button>
      <p className="text-center text-[11px] leading-4 text-gray-600">
        Claiming adds official details to the place. Community recommendations and stories stay as they are.
      </p>
    </form>
  )
}
