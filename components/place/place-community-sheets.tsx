'use client'

/**
 * Sheets of the Place page's traveller content (all recommendations, all
 * comments of a story). Loaded on demand by place-community.tsx.
 */

import { useEffect, useState } from 'react'

import { PersonAvatar, RecommenderCard, formatCount, formatRelativeDate } from '@/components/place/place-community'
import { PlaceSheet } from '@/components/place/place-sheet'
import type { PublicPlaceComment, PublicPlaceRecommender, PublicPlaceStoryPreview } from '@/lib/place-landing'
import { fetchPublicPlaceRecommenders, fetchPublicStoryComments } from '@/lib/place-public-api'

export function RecommendersSheet({
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
            className="w-full rounded-xl border border-n-line-strong bg-n-surface px-4 py-2.5 text-sm font-semibold text-n-ink hover:bg-n-hover disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : null
      }
    >
      {loading && !booted ? (
        <ul className="space-y-2.5" aria-busy="true">
          {[0, 1, 2, 3].map(i => (
            <li
              key={i}
              className="rounded-xl border border-n-line bg-n-surface px-3 py-2.5"
            >
              <div className="flex items-start gap-3">
                <SkeletonBone className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonBone className="h-3.5 w-28 rounded" />
                  <SkeletonBone className="h-3 w-full rounded" />
                  <SkeletonBone className="h-3 w-2/3 rounded" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-n-muted">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-n-subtle">
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

export function CommentsSheet({
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
            className="w-full rounded-xl border border-n-line-strong bg-n-surface px-4 py-2.5 text-sm font-semibold text-n-ink hover:bg-n-hover disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : null
      }
    >
      {loading && !booted ? (
        <ul className="space-y-3" aria-busy="true">
          {[0, 1, 2, 3, 4].map(i => (
            <li key={i} className="flex gap-2.5">
              <SkeletonBone className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <SkeletonBone className="h-3 w-24 rounded" />
                <SkeletonBone className="h-3 w-full rounded" />
                <SkeletonBone className="h-2.5 w-12 rounded" />
              </div>
            </li>
          ))}
        </ul>
      ) : error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-n-muted">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-n-subtle">No comments yet.</p>
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
                <p className="text-[13px] text-n-ink-2">
                  <span className="font-semibold text-n-ink">
                    {comment.displayName}
                  </span>{' '}
                  <span>{comment.text}</span>
                </p>
                {formatRelativeDate(comment.createdAt) ? (
                  <p className="mt-0.5 text-[11px] text-n-subtle">
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

function SkeletonBone({ className }: { className?: string }) {
  return <div className={`n-skeleton ${className ?? ''}`} aria-hidden />
}

