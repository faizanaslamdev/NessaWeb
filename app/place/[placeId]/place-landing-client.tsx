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
  fetchPublicPlaceRecommenders,
  fetchPublicStoryComments,
  isPublicPlaceIdValid,
  PublicPlaceLandingError,
  type PublicPlaceComment,
  type PublicPlaceLanding,
  type PublicPlaceRecommender,
  type PublicPlaceStoryPreview,
} from '@/lib/place-landing'
import { StoryPhotoCollage } from '@/components/place/story-photo-collage'
import { StoryMediaViewer } from '@/components/place/story-media-viewer'
import { PlaceSheet } from '@/components/place/place-sheet'

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
  const labels: Record<string, string> = {
    language_question: 'Language Question',
    travel_update: 'Travel Update',
    recommendation: 'Recommendation',
    daily_life: 'Daily Life',
    cultural_post: 'Cultural Post',
  }
  return labels[type] ?? type.trim().replace(/_/g, ' ')
}

function storyTypeClasses(type?: string): string {
  switch (type) {
    case 'language_question':
      return 'bg-violet-500/15 text-violet-300'
    case 'travel_update':
      return 'bg-blue-500/15 text-blue-300'
    case 'recommendation':
      return 'bg-emerald-500/15 text-emerald-300'
    case 'daily_life':
      return 'bg-amber-500/15 text-amber-300'
    case 'cultural_post':
      return 'bg-orange-500/15 text-orange-300'
    default:
      return 'bg-white/10 text-gray-300'
  }
}

function storyMediaUris(story: PublicPlaceStoryPreview): string[] {
  if (Array.isArray(story.media) && story.media.length > 0) {
    return story.media.map(m => m.url).filter(Boolean)
  }
  return story.thumbnailUrl ? [story.thumbnailUrl] : []
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
  const [coverViewerOpen, setCoverViewerOpen] = useState(false)
  const [coverBroken, setCoverBroken] = useState(false)

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
          setCoverBroken(false)
          setCoverViewerOpen(false)
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
  const moreStories = Math.max(0, place.storyCount - stories.length)
  const coverUrl = place.coverImageUrl?.trim() || ''
  const hasCover = coverUrl.startsWith('https://') && !coverBroken

  return (
    <Shell>
      <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="relative aspect-[16/10] w-full bg-[#14101f]">
          {hasCover ? (
            <button
              type="button"
              onClick={() => setCoverViewerOpen(true)}
              className="group relative block h-full w-full cursor-zoom-in p-0"
              aria-label={`View photo of ${place.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote Google Places media URLs */}
              <img
                src={coverUrl}
                alt=""
                className="h-full w-full object-cover"
                fetchPriority="high"
                onError={() => {
                  setCoverBroken(true)
                  setCoverViewerOpen(false)
                }}
              />
              <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
            </button>
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

      <StoryMediaViewer
        key={coverViewerOpen ? `cover-${coverUrl}` : 'cover-closed'}
        open={coverViewerOpen && hasCover}
        uris={hasCover ? [coverUrl] : []}
        initialIndex={0}
        onClose={() => setCoverViewerOpen(false)}
      />

      {recommenders.length > 0 ? (
        <RecommendedBySection
          placeId={place.googlePlaceId}
          recommenders={recommenders}
          recommenderCount={place.recommenderCount}
        />
      ) : null}

      <div className="mt-6 w-full max-w-sm space-y-2">
        <a
          href={deepLink}
          className="inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white no-underline hover:bg-violet-500"
        >
          Recommend us on Nessa
        </a>
        <p className="text-center text-xs text-gray-500">
          Opens this place in {siteConfig.name} so you can recommend it.
        </p>
      </div>

      {stories.length > 0 ? (
        <StoriesSection stories={stories} moreCount={moreStories} />
      ) : null}

      <StoreFallback className="mt-8" />
    </Shell>
  )
}

function RecommenderCard({ person }: { person: PublicPlaceRecommender }) {
  const relative = formatRelativeDate(person.createdAt)
  const note = person.note?.trim()

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-start gap-3">
        <PersonAvatar name={person.displayName} avatarUrl={person.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="truncate text-sm font-medium text-gray-100">
              {person.displayName}
            </p>
            {relative ? (
              <p className="text-[11px] text-gray-500">{relative}</p>
            ) : null}
          </div>
          {note ? (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
              {note}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function RecommendedBySection({
  placeId,
  recommenders,
  recommenderCount,
}: {
  placeId: string
  recommenders: PublicPlaceRecommender[]
  recommenderCount: number
}) {
  const [open, setOpen] = useState(false)
  const moreCount = Math.max(0, recommenderCount - recommenders.length)

  return (
    <section className="mt-6 w-full text-left">
      <h2 className="mb-3 text-sm font-semibold text-white">Recommended by</h2>
      <ul className="space-y-2.5">
        {recommenders.map((person, index) => (
          <RecommenderCard
            key={`${person.displayName}-${person.createdAt ?? index}`}
            person={person}
          />
        ))}
      </ul>
      {moreCount > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 text-xs font-medium text-violet-300 hover:text-violet-200"
        >
          View all {formatCount(recommenderCount)} recommendations
        </button>
      ) : null}

      <RecommendersSheet
        open={open}
        onClose={() => setOpen(false)}
        placeId={placeId}
        initial={recommenders}
        totalCount={recommenderCount}
      />
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
  const [viewer, setViewer] = useState<{
    uris: string[]
    index: number
  } | null>(null)
  const [commentsStory, setCommentsStory] = useState<PublicPlaceStoryPreview | null>(
    null,
  )

  return (
    <section className="mt-6 w-full text-left">
      <h2 className="mb-3 text-sm font-semibold text-white">
        Stories from this place
      </h2>
      <ul className="space-y-4">
        {stories.map(story => {
          const uris = storyMediaUris(story)
          const typeLabel = formatStoryType(story.type)
          const relative = formatRelativeDate(story.createdAt)
          const comments = story.commentsPreview ?? []
          const commentCount = story.commentCount ?? 0

          return (
            <li
              key={story.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              <div className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <PersonAvatar
                    name={story.author.displayName}
                    avatarUrl={story.author.avatarUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">
                        {story.author.displayName}
                      </p>
                      {typeLabel ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${storyTypeClasses(story.type)}`}
                        >
                          {typeLabel}
                        </span>
                      ) : null}
                    </div>
                    {relative ? (
                      <p className="mt-0.5 text-[11px] text-gray-500">{relative}</p>
                    ) : null}
                  </div>
                </div>

                {story.caption ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                    {story.caption}
                  </p>
                ) : null}
              </div>

              {uris.length > 0 ? (
                <div className="px-2 pb-2 sm:px-3 sm:pb-3">
                  <StoryPhotoCollage
                    uris={uris}
                    onPressPhoto={index => setViewer({ uris, index })}
                  />
                </div>
              ) : null}

              {(comments.length > 0 || commentCount > 0) && (
                <div className="space-y-2.5 border-t border-white/10 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Comments
                    {commentCount > 0 ? (
                      <span className="ml-1 font-medium normal-case text-gray-400">
                        · {formatCount(commentCount)}
                      </span>
                    ) : null}
                  </p>
                  {comments.length > 0 ? (
                    <ul className="space-y-2.5">
                      {comments.map((comment, index) => (
                        <li
                          key={`${story.id}-c-${index}`}
                          className="flex gap-2.5"
                        >
                          <PersonAvatar
                            name={comment.displayName}
                            avatarUrl={comment.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-200">
                              <span className="font-semibold text-white">
                                {comment.displayName}
                              </span>{' '}
                              <span className="text-gray-300">{comment.text}</span>
                            </p>
                            {formatRelativeDate(comment.createdAt) ? (
                              <p className="mt-0.5 text-[10px] text-gray-500">
                                {formatRelativeDate(comment.createdAt)}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {commentCount > comments.length ? (
                    <button
                      type="button"
                      onClick={() => setCommentsStory(story)}
                      className="text-xs font-medium text-violet-300 hover:text-violet-200"
                    >
                      View all {formatCount(commentCount)} comments
                    </button>
                  ) : null}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {moreCount > 0 ? (
        <p className="mt-2 text-xs text-gray-500">
          +{formatCount(moreCount)} more stor{moreCount === 1 ? 'y' : 'ies'} in{' '}
          {siteConfig.name}
        </p>
      ) : null}

      <StoryMediaViewer
        key={
          viewer
            ? `${viewer.uris[0] ?? 'x'}-${viewer.index}-${viewer.uris.length}`
            : 'closed'
        }
        open={Boolean(viewer)}
        uris={viewer?.uris ?? []}
        initialIndex={viewer?.index ?? 0}
        onClose={() => setViewer(null)}
      />

      <CommentsSheet
        open={Boolean(commentsStory)}
        onClose={() => setCommentsStory(null)}
        story={commentsStory}
      />
    </section>
  )
}

function RecommendersSheet({
  open,
  onClose,
  placeId,
  initial,
  totalCount,
}: {
  open: boolean
  onClose: () => void
  placeId: string
  initial: PublicPlaceRecommender[]
  totalCount: number
}) {
  const [items, setItems] = useState<PublicPlaceRecommender[]>(initial)
  const [cursor, setCursor] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) {
        return
      }
      setItems(initial)
      setCursor(undefined)
      setError(null)
      setLoading(true)
      setBooted(false)
      fetchPublicPlaceRecommenders({ placeId, pageSize: 20 })
        .then(page => {
          if (cancelled) {
            return
          }
          setItems(page.recommenders)
          setCursor(page.nextCursor)
          setBooted(true)
        })
        .catch(() => {
          if (!cancelled) {
            setError('Could not load recommendations.')
            setBooted(true)
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
          }
        })
    })
    return () => {
      cancelled = true
    }
  }, [open, placeId, initial])

  const loadMore = () => {
    if (!cursor || loading) {
      return
    }
    setLoading(true)
    fetchPublicPlaceRecommenders({ placeId, cursor, pageSize: 20 })
      .then(page => {
        setItems(prev => [...prev, ...page.recommenders])
        setCursor(page.nextCursor)
      })
      .catch(() => setError('Could not load more.'))
      .finally(() => setLoading(false))
  }

  return (
    <PlaceSheet
      open={open}
      onClose={onClose}
      title={`Recommended by · ${formatCount(totalCount)}`}
      footer={
        cursor ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : null
      }
    >
      {loading && !booted ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
      ) : error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No recommendations yet.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((person, index) => (
            <RecommenderCard
              key={`${person.displayName}-${person.createdAt ?? index}`}
              person={person}
            />
          ))}
        </ul>
      )}
    </PlaceSheet>
  )
}

function CommentsSheet({
  open,
  onClose,
  story,
}: {
  open: boolean
  onClose: () => void
  story: PublicPlaceStoryPreview | null
}) {
  const [items, setItems] = useState<PublicPlaceComment[]>([])
  const [cursor, setCursor] = useState<string | undefined>()
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    if (!open || !story) {
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) {
        return
      }
      setItems(story.commentsPreview ?? [])
      setTotal(story.commentCount ?? 0)
      setCursor(undefined)
      setError(null)
      setLoading(true)
      setBooted(false)
      fetchPublicStoryComments({ storyId: story.id, pageSize: 20 })
        .then(page => {
          if (cancelled) {
            return
          }
          setItems(page.comments)
          setTotal(page.commentCount)
          setCursor(page.nextCursor)
          setBooted(true)
        })
        .catch(() => {
          if (!cancelled) {
            setError('Could not load comments.')
            setBooted(true)
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
          }
        })
    })
    return () => {
      cancelled = true
    }
  }, [open, story])

  const loadMore = () => {
    if (!story || !cursor || loading) {
      return
    }
    setLoading(true)
    fetchPublicStoryComments({
      storyId: story.id,
      cursor,
      pageSize: 20,
    })
      .then(page => {
        setItems(prev => [...prev, ...page.comments])
        setCursor(page.nextCursor)
        setTotal(page.commentCount)
      })
      .catch(() => setError('Could not load more.'))
      .finally(() => setLoading(false))
  }

  return (
    <PlaceSheet
      open={open}
      onClose={onClose}
      title={`Comments · ${formatCount(total)}`}
      footer={
        cursor ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : null
      }
    >
      {loading && !booted ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
      ) : error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((comment, index) => (
            <li
              key={`${comment.displayName}-${comment.createdAt ?? index}`}
              className="flex gap-2.5"
            >
              <PersonAvatar
                name={comment.displayName}
                avatarUrl={comment.avatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-200">
                  <span className="font-semibold text-white">
                    {comment.displayName}
                  </span>{' '}
                  <span className="text-gray-300">{comment.text}</span>
                </p>
                {formatRelativeDate(comment.createdAt) ? (
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    {formatRelativeDate(comment.createdAt)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PlaceSheet>
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
        <div className="h-11 w-full animate-pulse rounded-xl bg-violet-600/30" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-white/5" />
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
        {[0, 1].map(i => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-white/10"
          >
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
                <div className="space-y-2">
                  <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
                  <div className="h-2.5 w-16 animate-pulse rounded bg-white/5" />
                </div>
              </div>
              <div className="h-3 w-full animate-pulse rounded bg-white/5" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
            </div>
            <div className="mx-2 mb-2 h-[260px] animate-pulse rounded-xl bg-white/5 sm:mx-3 sm:mb-3" />
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
