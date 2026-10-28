'use client'

/**
 * "Find your business" — the start of claiming. Step 1 searches places
 * already on Nessa; if the business isn't there, signed-in owners can search
 * Google Maps and claim it from the listing (the backend adds the place when
 * the claim is filed). Every claim is reviewed by Nessa.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { Icon } from '@/components/dash/icons'
import { PlaceRow } from '@/components/site/place-card'
import { PlaceSearch } from '@/components/site/place-search'
import { cx, siteButtonClass } from '@/components/site/ui'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { accountRoutes } from '@/lib/account/constants'
import {
  GooglePlaceSearchError,
  newSearchSessionToken,
  searchGooglePlaces,
  type GooglePlaceResult,
} from '@/lib/google-place-search'
import { placeHref, type DirectoryPlace } from '@/lib/place-directory'

const claimHref = (placeId: string) => `${accountRoutes.claim}/${encodeURIComponent(placeId)}`

export function FindYourPlace({ places }: { places: DirectoryPlace[] }) {
  const params = useSearchParams()
  const initialQuery = params.get('q') ?? ''
  const [mode, setMode] = useState<'nessa' | 'google'>(params.get('find') === 'google' ? 'google' : 'nessa')
  const [picked, setPicked] = useState<DirectoryPlace | null>(null)
  const [query, setQuery] = useState(initialQuery)

  return (
    <div className="rounded-[24px] border border-n-line bg-n-surface p-5 shadow-[0_1px_2px_rgb(27_26_23/0.04),0_16px_40px_-16px_rgb(27_26_23/0.16)] sm:p-7">
      <div role="tablist" aria-label="Where to search" className="mb-5 inline-flex rounded-xl bg-n-sunken p-1">
        {(
          [
            ['nessa', 'On Nessa'],
            ['google', 'Not on Nessa yet'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value)
              setPicked(null)
            }}
            className={cx(
              'rounded-lg px-3.5 py-2 text-[14px] font-semibold transition-colors',
              mode === value ? 'bg-n-surface text-n-ink shadow-n-card' : 'text-n-muted hover:text-n-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'nessa' ? (
        <>
          <PlaceSearch
            places={places}
            label="Search your business on Nessa"
            placeholder="Your business name or town"
            initialQuery={initialQuery}
            onQueryChange={setQuery}
            onPick={p => setPicked(p)}
            onSubmit={() => undefined}
            footer={q => (
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  setQuery(q)
                  setMode('google')
                }}
                className="text-[14px] font-semibold text-n-accent-strong hover:underline"
              >
                Not listed? Find it on Google Maps →
              </button>
            )}
          />
          {picked ? (
            <PickedPlace place={picked} onClear={() => setPicked(null)} />
          ) : (
            <p className="mt-4 text-[14px] leading-6 text-n-muted">
              Type your business name and pick it from the list. Not there?{' '}
              <button type="button" onClick={() => setMode('google')} className="font-semibold text-n-accent-strong hover:underline">
                Find it on Google Maps
              </button>
              .
            </p>
          )}
        </>
      ) : (
        <GoogleSearch initialQuery={query} />
      )}
    </div>
  )
}

function PickedPlace({ place, onClear }: { place: DirectoryPlace; onClear: () => void }) {
  return (
    <div className="mt-5 rounded-2xl border border-n-line bg-n-surface-2 p-4">
      <PlaceRow place={place} href={placeHref(place)} />
      {place.verified ? (
        <div className="mt-4 rounded-xl bg-n-sunken px-4 py-3 text-[14px] leading-6 text-n-ink-2">
          <strong className="font-semibold text-n-ink">Already managed by a verified business.</strong> If you work there, ask
          the owner to invite you from <em>Team</em> in their business tools. If you think this is wrong, email us.
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href={claimHref(place.placeId)} className={siteButtonClass('primary', 'md')}>
            Claim {place.name}
            <Icon name="arrow-right" size={16} />
          </Link>
          <button type="button" onClick={onClear} className={siteButtonClass('ghost', 'md')}>
            Choose another place
          </button>
        </div>
      )}
    </div>
  )
}

function GoogleSearch({ initialQuery }: { initialQuery: string }) {
  const { user, loading } = useAccountAuth()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<GooglePlaceResult[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const session = useRef(newSearchSessionToken())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) inputRef.current?.focus()
  }, [user])

  if (loading) {
    return <div className="n-skeleton h-[120px] rounded-2xl" aria-hidden />
  }

  if (!user) {
    const next = encodeURIComponent(`/for-businesses?find=google${initialQuery ? `&q=${encodeURIComponent(initialQuery)}` : ''}#find`)
    return (
      <div className="rounded-2xl bg-n-surface-2 p-5 ring-1 ring-n-line">
        <p className="text-[16px] font-semibold">Sign in to search Google Maps</p>
        <p className="mt-1 text-[14px] leading-6 text-n-muted">
          Use your NessaChat account (or create one — it’s free). Then find your business on Google Maps and claim it;
          we’ll add it to Nessa when you send the claim.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`${accountRoutes.signIn}?next=${next}`} className={siteButtonClass('primary', 'md')}>
            Sign in
          </Link>
          <Link href={`${accountRoutes.signUp}?next=${next}`} className={siteButtonClass('secondary', 'md')}>
            Create an account
          </Link>
        </div>
      </div>
    )
  }

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (query.trim().length < 2) {
      setError('Type at least 2 characters.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      setResults(await searchGooglePlaces(query, session.current))
    } catch (err) {
      setResults(null)
      setError(err instanceof GooglePlaceSearchError ? err.message : 'Search failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <form role="search" onSubmit={e => void run(e)} className="flex gap-2">
        <label htmlFor="g-search" className="sr-only">
          Business name and town
        </label>
        <div className="relative min-w-0 flex-1">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-n-subtle" />
          <input
            ref={inputRef}
            id="g-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Business name and town"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-n-line-strong bg-n-surface pr-3 pl-10 text-[15px] text-n-ink outline-none placeholder:text-n-faint focus:border-n-accent focus:ring-4 focus:ring-n-accent/12"
          />
        </div>
        <button type="submit" disabled={busy} className={siteButtonClass('primary', 'lg', 'h-12')}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>
      <p className="mt-2 text-[12px] text-n-subtle">Results from Google Maps. Include the town for best results.</p>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-n-danger-soft px-4 py-3 text-[14px] text-n-danger">
          {error}
        </p>
      ) : null}
      {results ? (
        results.length ? (
          <ul className="mt-4 divide-y divide-n-line-soft rounded-2xl border border-n-line">
            {results.map(r => (
              <li key={r.googlePlaceId} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-n-sunken text-n-muted">
                  <Icon name="store" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{r.name}</span>
                  <span className="block truncate text-[13px] text-n-muted">{r.secondaryText || r.city}</span>
                </span>
                <Link href={claimHref(r.googlePlaceId)} className={siteButtonClass('secondary', 'md')}>
                  Claim
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[14px] text-n-muted">No businesses found. Try adding the town or a different spelling.</p>
        )
      ) : null}
    </div>
  )
}
