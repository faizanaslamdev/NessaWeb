'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import {
  appStores,
  placeAppDeepLink,
  siteConfig,
  siteRoutes,
} from '@/lib/constants'
import {
  fetchPublicPlaceLanding,
  isPublicPlaceIdValid,
  PublicPlaceLandingError,
  type PublicPlaceLanding,
} from '@/lib/place-landing'

type PlaceLandingClientProps = {
  placeId: string
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; place: PublicPlaceLanding }
  | { kind: 'invalid' }
  | { kind: 'error'; title: string; body: string }

function formatLocation(place: PublicPlaceLanding): string {
  const parts = [place.city, place.country].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(', ')
  }
  return place.formattedAddress?.trim() || ''
}

function formatCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  }
  return String(n)
}

/**
 * Business-first Place QR landing.
 * Recommend / Open try the native deep link; store fallback stays secondary.
 */
export function PlaceLandingClient({ placeId }: PlaceLandingClientProps) {
  const deepLink = useMemo(() => placeAppDeepLink(placeId), [placeId])
  const placeIdValid = isPublicPlaceIdValid(placeId)
  const [state, setState] = useState<LoadState>(() =>
    placeIdValid ? { kind: 'loading' } : { kind: 'invalid' },
  )

  useEffect(() => {
    if (!placeIdValid) {
      return
    }

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setState({ kind: 'loading' })
      }
    })

    fetchPublicPlaceLanding(placeId)
      .then(place => {
        if (!cancelled) {
          setState({ kind: 'ready', place })
        }
      })
      .catch((e: unknown) => {
        if (cancelled) {
          return
        }
        if (e instanceof PublicPlaceLandingError) {
          if (e.code === 'invalid-argument') {
            setState({ kind: 'invalid' })
            return
          }
          setState({
            kind: 'error',
            title:
              e.code === 'not-found' ? 'Place not found' : 'Couldn’t load place',
            body: e.message,
          })
          return
        }
        setState({
          kind: 'error',
          title: 'Couldn’t load place',
          body: 'Please try again in a moment.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [placeId, placeIdValid])

  const openInApp = () => {
    window.location.href = deepLink
  }

  if (!placeIdValid || state.kind === 'invalid') {
    return (
      <Shell>
        <StatusBlock
          title="Invalid place link"
          body="This QR or URL doesn’t point to a valid Nessa place."
        />
        <StoreFallback className="mt-8" />
      </Shell>
    )
  }

  if (state.kind === 'error') {
    return (
      <Shell>
        <StatusBlock title={state.title} body={state.body} />
        <div className="mt-6 w-full max-w-sm space-y-3">
          <button
            type="button"
            onClick={openInApp}
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-gray-200 hover:bg-white/10"
          >
            Open in Nessa
          </button>
        </div>
        <StoreFallback className="mt-6" />
      </Shell>
    )
  }

  if (state.kind !== 'ready') {
    return (
      <Shell>
        <div className="h-48 w-full animate-pulse rounded-2xl bg-white/5" />
        <div className="mt-6 h-8 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-white/5" />
        <p className="mt-8 text-center text-sm text-gray-500">Loading place…</p>
      </Shell>
    )
  }

  const { place } = state
  const location = formatLocation(place)

  return (
    <Shell>
      <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="relative aspect-[16/10] w-full bg-[#14101f]">
          {place.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Google Places media URLs
            <img
              src={place.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              {siteConfig.name}
            </div>
          )}
        </div>

        <div className="space-y-3 p-5 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-400">
            {place.placeType}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {place.name}
          </h1>
          {location ? <p className="text-sm text-gray-400">{location}</p> : null}
          {place.formattedAddress && place.formattedAddress !== location ? (
            <p className="text-xs text-gray-500">{place.formattedAddress}</p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2 text-xs text-gray-400">
            <span>
              <span className="font-semibold text-white">
                {formatCount(place.recommenderCount)}
              </span>{' '}
              recommended
            </span>
            <span className="text-white/20">·</span>
            <span>
              <span className="font-semibold text-white">
                {formatCount(place.storyCount)}
              </span>{' '}
              stories
            </span>
            {place.visitedCount > 0 ? (
              <>
                <span className="text-white/20">·</span>
                <span>
                  <span className="font-semibold text-white">
                    {formatCount(place.visitedCount)}
                  </span>{' '}
                  visited
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 w-full max-w-sm space-y-3">
        <button
          type="button"
          onClick={openInApp}
          className="inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Recommend us on Nessa
        </button>
        <p className="text-center text-xs text-gray-500">
          Opens this place in {siteConfig.name} so you can recommend it.
        </p>

        <button
          type="button"
          onClick={openInApp}
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-gray-200 hover:bg-white/10"
        >
          Open in Nessa
        </button>
      </div>

      <StoreFallback className="mt-8" />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-black px-5 py-10 text-white">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-white no-underline"
        >
          {siteConfig.name}
        </Link>
        <Link
          href={siteRoutes.privacyPolicy}
          className="text-xs text-gray-500 no-underline hover:text-gray-300"
        >
          Privacy
        </Link>
      </div>
      <div className="flex w-full max-w-md flex-col items-center">{children}</div>
    </div>
  )
}

function StatusBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
      <h1 className="mb-2 text-lg font-semibold text-white">{title}</h1>
      <p className="text-sm text-gray-400">{body}</p>
    </div>
  )
}

function StoreFallback({ className = '' }: { className?: string }) {
  return (
    <div className={`flex w-full max-w-sm flex-col items-center gap-3 ${className}`}>
      <p className="text-xs text-gray-500">Don&apos;t have the app?</p>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        {appStores.map(store => (
          <a
            key={store.name}
            href={store.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-200 no-underline hover:bg-white/10"
          >
            {store.label}
          </a>
        ))}
      </div>
    </div>
  )
}
