'use client'

/**
 * Traveller content on the public Place page: "Recommended by" and
 * "Stories from this place" (client islands — relative times, sheets and the
 * photo viewer). The sheets and viewer load only when opened.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'

import { StoryPhotoCollage } from '@/components/place/story-photo-collage'
import { siteConfig } from '@/lib/constants'
import type {
  PublicPlaceRecommender,
  PublicPlaceStoryPreview,
} from '@/lib/place-landing'

const StoryMediaViewer = dynamic(
  () => import('@/components/place/story-media-viewer').then(m => m.StoryMediaViewer),
  { ssr: false },
)
const RecommendersSheet = dynamic(
  () => import('@/components/place/place-community-sheets').then(m => m.RecommendersSheet),
  { ssr: false },
)
const CommentsSheet = dynamic(
  () => import('@/components/place/place-community-sheets').then(m => m.CommentsSheet),
  { ssr: false },
)

const subscribeNoop = () => () => {}

/**
 * False during SSR and hydration, true afterwards. Relative times ("5m ago")
 * depend on the clock and the server HTML may be cached, so they render only
 * on the client to avoid hydration mismatches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )
}

export function formatCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  }
  return String(n)
}

export function formatRelativeDate(iso?: string): string | null {
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
      return 'bg-[#eeebfd] text-[#4a36c9]'
    case 'travel_update':
      return 'bg-[#e6effc] text-[#1f5fbf]'
    case 'recommendation':
      return 'bg-[#e3f2ee] text-[#0e6b5c]'
    case 'daily_life':
      return 'bg-[#fbf0dd] text-[#8a4a06]'
    case 'cultural_post':
      return 'bg-[#fbeee4] text-[#a2531c]'
    default:
      return 'bg-n-sunken text-n-ink-2'
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

export function RecommenderCard({ person }: { person: PublicPlaceRecommender }) {
  const hydrated = useHydrated()
  const relative = hydrated ? formatRelativeDate(person.createdAt) : null
  const note = person.note?.trim()

  return (
    <li className="rounded-2xl border border-n-line bg-n-surface px-4 py-3.5">
      <div className="flex items-start gap-3">
        <PersonAvatar name={person.displayName} avatarUrl={person.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="truncate text-[15px] font-semibold text-n-ink">
              {person.displayName}
            </p>
            {relative ? (
              <p className="text-[12px] text-n-subtle">{relative}</p>
            ) : null}
          </div>
          {note ? (
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-6 text-n-ink-2">
              {note}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  )
}

export function RecommendedBySection({
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
    <section aria-labelledby="recs-title" className="w-full text-left">
      <h2 id="recs-title" className="mb-4 text-[20px] font-semibold tracking-[-0.015em]">Recommended by</h2>
      <ul className="grid gap-3 md:grid-cols-2">
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
          className="mt-4 text-[14px] font-semibold text-n-accent-strong hover:underline"
        >
          View all {formatCount(recommenderCount)} recommendations
        </button>
      ) : null}

      {open ? (
        <RecommendersSheet
          open
          onClose={() => setOpen(false)}
          placeId={placeId}
          initial={recommenders}
          totalCount={recommenderCount}
        />
      ) : null}
    </section>
  )
}

export function StoriesSection({
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
  const hydrated = useHydrated()

  return (
    <section aria-labelledby="stories-title" className="w-full text-left">
      <h2 id="stories-title" className="mb-4 text-[20px] font-semibold tracking-[-0.015em]">
        Stories from this place
      </h2>
      <ul className="space-y-4">
        {stories.map(story => {
          const uris = storyMediaUris(story)
          const typeLabel = formatStoryType(story.type)
          const relative = hydrated ? formatRelativeDate(story.createdAt) : null
          const comments = story.commentsPreview ?? []
          const commentCount = story.commentCount ?? 0

          return (
            <li
              key={story.id}
              className="overflow-hidden rounded-2xl border border-n-line bg-n-surface"
            >
              <div className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <PersonAvatar
                    name={story.author.displayName}
                    avatarUrl={story.author.avatarUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-n-ink">
                        {story.author.displayName}
                      </p>
                      {typeLabel ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${storyTypeClasses(story.type)}`}
                        >
                          {typeLabel}
                        </span>
                      ) : null}
                    </div>
                    {relative ? (
                      <p className="mt-0.5 text-[12px] text-n-subtle">{relative}</p>
                    ) : null}
                  </div>
                </div>

                {story.caption ? (
                  <p className="whitespace-pre-wrap text-[15px] leading-6 text-n-ink-2">
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
                <div className="space-y-2.5 border-t border-n-line-soft px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-n-subtle">
                    Comments
                    {commentCount > 0 ? (
                      <span className="ml-1 font-medium normal-case text-n-muted">
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
                            <p className="text-[13px] text-n-ink-2">
                              <span className="font-semibold text-n-ink">
                                {comment.displayName}
                              </span>{' '}
                              <span>{comment.text}</span>
                            </p>
                            {hydrated && formatRelativeDate(comment.createdAt) ? (
                              <p className="mt-0.5 text-[11px] text-n-subtle">
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
                      className="text-[13px] font-semibold text-n-accent-strong hover:underline"
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
        <p className="mt-3 text-[13px] text-n-subtle">
          +{formatCount(moreCount)} more stor{moreCount === 1 ? 'y' : 'ies'} in the{' '}
          {siteConfig.name} app
        </p>
      ) : null}

      {viewer ? (
        <StoryMediaViewer
          key={`${viewer.uris[0] ?? 'x'}-${viewer.index}-${viewer.uris.length}`}
          open
          uris={viewer.uris}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      ) : null}

      {commentsStory ? (
        <CommentsSheet open onClose={() => setCommentsStory(null)} story={commentsStory} />
      ) : null}
    </section>
  )
}

export function PersonAvatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string
  avatarUrl?: string
  size?: 'sm' | 'md'
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const dim = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl
  const imgRef = useRef<HTMLImageElement | null>(null)
  // Server-rendered images can finish loading before hydration attaches
  // onLoad / onError — read the element's state once mounted.
  useEffect(() => {
    const img = imgRef.current
    if (!img || !img.complete || !avatarUrl) return
    if (img.naturalWidth > 0) setLoadedUrl(avatarUrl)
    else setFailedUrl(avatarUrl)
  }, [avatarUrl])

  // Initials sit under the photo: a slow load never shows an empty circle,
  // and a failed photo (old avatar link) leaves the initials.
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-n-accent-soft ${dim}`}
    >
      <span className="flex h-full w-full items-center justify-center font-semibold text-n-accent-strong">
        {initialLetter(name)}
      </span>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- Firebase download URLs
        <img
          ref={imgRef}
          src={avatarUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${
            loadedUrl === avatarUrl ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoadedUrl(avatarUrl ?? null)}
          onError={() => setFailedUrl(avatarUrl ?? null)}
        />
      ) : null}
    </div>
  )
}

