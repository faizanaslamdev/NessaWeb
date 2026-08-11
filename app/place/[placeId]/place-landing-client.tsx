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
  type PublicPlaceRecommender,
  type PublicPlaceStoryPreview,
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

function formatRelativeDate(iso?: string): string | null {
  if (!iso) {
    return null
  }
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) {
    return null
  }
  const diffMs = Date.now() - then
  if (diffMs < 0) {
    return null
  }
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) {
    return 'Just now'
  }
  if (mins < 60) {
    return `${mins}m ago`
  }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `${days}d ago`
  }
  const months = Math.floor(days / 30)
  if (months < 12) {
    return `${months}mo ago`
  }
  return `${Math.floor(months / 12)}y ago`
}

function formatStoryType(type?: string): string | null {
  if (!type?.trim()) {
    return null
  }
  const raw = type.trim().replace(/_/g, ' ')
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function initialLetter(name: string): string {
  const ch = name.trim().charAt(0)
  return ch ? ch.toUpperCase() : '?'
}

/**
 * Business-first Place QR landing with read-only social proof.
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
          <a
            href={deepLink}
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-gray-200 no-underline hover:bg-white/10"
          >
            Open in Nessa
          </a>
        </div>
        <StoreFallback className="mt-6" />
      </Shell>
    )
  }

  if (state.kind !== 'ready') {
    return (
      <Shell>
        <PlaceSkeleton />
      </Shell>
    )
  }

  const { place } = state
  const location = formatLocation(place)
  const recommenders = place.recommenders ?? []
  const stories = place.stories ?? []
  const moreRecommenders = Math.max(
    0,
    place.recommenderCount - recommenders.length,
  )
  const moreStories = Math.max(0, place.storyCount - stories.length)

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
              fetchPriority="high"
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

      {recommenders.length > 0 ? (
        <RecommendedBySection
          recommenders={recommenders}
          moreCount={moreRecommenders}
        />
      ) : null}

      {stories.length > 0 ? (
        <StoriesSection stories={stories} moreCount={moreStories} />
      ) : null}

      <div className="mt-6 w-full max-w-sm space-y-3">
        <a
          href={deepLink}
          className="inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white no-underline hover:bg-violet-500"
        >
          Recommend us on Nessa
        </a>
        <p className="text-center text-xs text-gray-500">
          Opens this place in {siteConfig.name} so you can recommend it.
        </p>

        <a
          href={deepLink}
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-gray-200 no-underline hover:bg-white/10"
        >
          Open in Nessa
        </a>
      </div>

      <StoreFallback className="mt-8" />
    </Shell>
  )
}

function RecommendedBySection({
  recommenders,
  moreCount,
}: {
  recommenders: PublicPlaceRecommender[]
  moreCount: number
}) {
  return (
    <section className="mt-6 w-full text-left">
      <h2 className="mb-3 text-sm font-semibold text-white">Recommended by</h2>
      <ul className="space-y-2.5">
        {recommenders.map((person, index) => (
          <li
            key={`${person.displayName}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
          >
            <PersonAvatar
              name={person.displayName}
              avatarUrl={person.avatarUrl}
            />
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-100">
              {person.displayName}
            </p>
          </li>
        ))}
      </ul>
      {moreCount > 0 ? (
        <p className="mt-2 text-xs text-gray-500">
          +{formatCount(moreCount)} more recommendation
          {moreCount === 1 ? '' : 's'}
        </p>
      ) : null}
    </section>
  )
}

function StoriesSection({
  stories,
  moreCount,
}: {
  stories: PublicPlaceStoryPreview[]
  moreCount: number
}) {
  return (
    <section className="mt-6 w-full text-left">
      <h2 className="mb-3 text-sm font-semibold text-white">
        Stories from this place
      </h2>
      <ul className="space-y-3">
        {stories.map(story => (
          <li
            key={story.id}
            className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
          >
            <div className="flex gap-3 p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#14101f]">
                {story.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Firebase download URLs
                  <img
                    src={story.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                    onError={event => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-gray-600">
                    Story
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <PersonAvatar
                    name={story.author.displayName}
                    avatarUrl={story.author.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-gray-200">
                      {story.author.displayName}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {[formatStoryType(story.type), formatRelativeDate(story.createdAt)]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>
                {story.caption ? (
                  <p className="line-clamp-2 text-xs leading-relaxed text-gray-400">
                    {story.caption}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {moreCount > 0 ? (
        <p className="mt-2 text-xs text-gray-500">
          +{formatCount(moreCount)} more stor{moreCount === 1 ? 'y' : 'ies'} in{' '}
          {siteConfig.name}
        </p>
      ) : null}
    </section>
  )
}

function PersonAvatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string
  avatarUrl?: string
  size?: 'sm' | 'md'
}) {
  const [failed, setFailed] = useState(false)
  const dim = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'
  const showImage = Boolean(avatarUrl) && !failed

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-violet-500/20 ${dim}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- Firebase download URLs
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold text-violet-200">
          {initialLetter(name)}
        </span>
      )}
    </div>
  )
}

function PlaceSkeleton() {
  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="aspect-[16/10] w-full animate-pulse bg-white/5" />
        <div className="space-y-3 p-5">
          <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
          <div className="h-7 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-white/5" />
          <div className="h-3 w-40 animate-pulse rounded bg-white/5" />
        </div>
      </div>
      <div className="mt-6 space-y-2.5">
        <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5"
          >
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-32 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
        {[0, 1].map(i => (
          <div
            key={i}
            className="flex gap-3 rounded-xl border border-white/10 p-3"
          >
            <div className="h-20 w-20 animate-pulse rounded-lg bg-white/5" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-full animate-pulse rounded bg-white/5" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-gray-500">Loading place…</p>
    </div>
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
