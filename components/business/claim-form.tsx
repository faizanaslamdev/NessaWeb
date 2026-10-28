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
import { nessaCoverUrl } from '@/lib/place-photo'
import { Icon } from '@/components/dash/icons'

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
      <ClaimFrame step={1}>
        <div className={`${accountCardClass} text-center`}>
          <p className="text-[15px] font-semibold text-n-ink">We couldn’t load this place</p>
          <p className="text-sm text-n-muted">Check the link, or find your business again.</p>
          <Link href="/for-businesses#find" className={accountButtonClass}>
            Find your business
          </Link>
        </div>
      </ClaimFrame>
    )
  }

  if (place?.business) {
    return (
      <ClaimFrame step={1} place={place}>
        <div className={`${accountCardClass}`}>
          <p className="text-[15px] font-semibold text-n-ink">{place.name} is already managed by a verified business</p>
          <p className="text-sm leading-6 text-n-muted">
            If you work there, ask the owner to invite you from <em>Team</em> in their business tools. If you think this
            is wrong, email us and we’ll sort it out.
          </p>
        </div>
      </ClaimFrame>
    )
  }

  if (done) {
    return (
      <ClaimFrame step={3} place={place}>
        <div className={`${accountCardClass}`}>
          <span className="flex size-11 items-center justify-center rounded-full bg-n-ok-soft text-n-ok">
            <Icon name="check" size={22} strokeWidth={2.25} />
          </span>
          <p className="text-[18px] font-semibold text-n-ink">Claim sent — thank you</p>
          <p className="text-sm leading-6 text-n-muted">
            A person on our team will review it and email you. Once it’s approved, {place?.name ?? 'your place'} shows
            Verified and your business tools open here.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={accountRoutes.business} className={`${accountButtonClass} w-auto! px-5`}>
              Go to your business
            </Link>
            <Link href="/places" className="inline-flex h-11 items-center rounded-[10px] px-4 text-sm font-semibold text-n-ink-2 hover:bg-n-hover">
              Explore places
            </Link>
          </div>
        </div>
      </ClaimFrame>
    )
  }

  return (
    <ClaimFrame step={2} place={place}>
      <form onSubmit={onSubmit} className={accountCardClass} noValidate aria-labelledby="claim-form-title">
        <h2 id="claim-form-title" className="text-[18px] font-semibold text-n-ink">
          Tell us about you
        </h2>
        <fieldset className="text-left">
          <legend className="text-[13px] font-medium text-n-ink-2">Your role</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(['owner', 'manager'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                aria-pressed={role === r}
                className={`rounded-[10px] border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  role === r ? 'border-n-accent bg-n-accent-soft text-n-accent-strong' : 'border-n-line-strong bg-n-surface text-n-ink-2 hover:bg-n-hover'
                }`}
              >
                {r === 'owner' ? 'Owner' : 'Manager'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] leading-5 text-n-subtle">
            {role === 'owner'
              ? 'You own this business. Once verified you manage the page and can invite your team.'
              : 'You run it for the owner. Nessa confirms manager access with the owner — the quickest way is for the owner to claim the place and invite you.'}
          </p>
        </fieldset>
        <label className="block text-left text-[13px] font-medium text-n-ink-2">
          Business name
          <input value={businessName} onChange={e => setBusinessName(e.target.value)} className={accountFieldClass} maxLength={80} required autoComplete="organization" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-left text-[13px] font-medium text-n-ink-2">
            Phone or WhatsApp <span className="font-normal text-n-subtle">(optional)</span>
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={accountFieldClass} inputMode="tel" maxLength={32} autoComplete="tel" />
          </label>
          <label className="block text-left text-[13px] font-medium text-n-ink-2">
            Website <span className="font-normal text-n-subtle">(optional)</span>
            <input value={website} onChange={e => setWebsite(e.target.value)} className={accountFieldClass} inputMode="url" maxLength={300} autoComplete="url" />
          </label>
        </div>
        <label className="block text-left text-[13px] font-medium text-n-ink-2">
          Anything that helps us verify you <span className="font-normal text-n-subtle">(optional)</span>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            className={`${accountFieldClass} min-h-24`}
            maxLength={500}
            placeholder="e.g. your role, how long you’ve run it, the best way to reach you"
          />
        </label>
        {error ? <p role="alert" className="rounded-[10px] bg-n-danger-soft px-3 py-2 text-sm text-n-danger">{error}</p> : null}
        <button type="submit" disabled={busy || placeState !== 'ready'} className={accountButtonClass}>
          {busy ? 'Sending…' : 'Send claim'}
        </button>
        <p className="text-center text-[12px] leading-5 text-n-subtle">
          Claiming adds official details to the place. Community recommendations and stories stay as they are.
        </p>
      </form>
    </ClaimFrame>
  )
}

const STEPS = ['Find your place', 'Your details', 'Verification']

function ClaimFrame({
  step,
  place,
  children,
}: {
  step: 1 | 2 | 3
  place?: PublicPlaceLanding | null
  children: React.ReactNode
}) {
  const where = place ? [place.city, place.country].filter(Boolean).join(', ') : ''
  const cover = nessaCoverUrl(place, true)
  return (
    <div>
      <ol aria-label="Claim steps" className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
        {STEPS.map((label, i) => {
          const n = i + 1
          const state = n < step ? 'done' : n === step ? 'current' : 'todo'
          return (
            <li key={label} className="flex items-center gap-2" aria-current={state === 'current' ? 'step' : undefined}>
              <span
                className={`flex size-6 items-center justify-center rounded-full text-[12px] font-semibold ${
                  state === 'todo' ? 'bg-n-sunken text-n-subtle' : 'bg-n-accent text-white'
                }`}
              >
                {state === 'done' ? <Icon name="check" size={13} strokeWidth={2.5} /> : n}
              </span>
              <span className={state === 'todo' ? 'text-n-subtle' : 'font-semibold text-n-ink'}>{label}</span>
              {n < STEPS.length ? <span aria-hidden className="mx-1 h-px w-6 bg-n-line-strong" /> : null}
            </li>
          )
        })}
      </ol>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-[18px] border border-n-line bg-n-surface shadow-n-card">
            <div className="flex aspect-[16/9] items-center justify-center bg-n-sunken text-n-faint">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- Google Places media URL
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon name="store" size={30} strokeWidth={1.4} />
              )}
            </div>
            <div className="p-4">
              <p className="text-[12px] font-medium text-n-subtle">You’re claiming</p>
              <p className="mt-0.5 text-[17px] font-semibold text-n-ink">{place?.name ?? '…'}</p>
              {where || place?.formattedAddress ? (
                <p className="mt-0.5 text-[13px] text-n-muted">{place?.formattedAddress || where}</p>
              ) : null}
              <Link href="/for-businesses#find" className="mt-3 inline-block text-[13px] font-semibold text-n-accent-strong hover:underline">
                Not your place? Search again
              </Link>
            </div>
          </div>
          <div className="rounded-[18px] border border-n-line bg-n-surface-2 p-4 text-[13px] leading-6 text-n-muted">
            <p className="font-semibold text-n-ink">What happens next</p>
            <ul className="mt-2 space-y-1.5">
              <li>• A person on our team reviews your claim.</li>
              <li>• We may email or call you to confirm.</li>
              <li>• Once approved, your page shows Verified and your business tools open.</li>
            </ul>
          </div>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  )
}
