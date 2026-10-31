'use client'

/**
 * Business → Inbox: travelers' messages to the business, per Place.
 * Desktop: list + conversation side by side. Phone (<768px): the list, then
 * the conversation full width (`?thread=` in the URL, so Back returns).
 */

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { useBusiness } from '@/components/business/dashboard/business-shell'
import { useInbox, useThreadList } from '@/components/business/dashboard/inbox/inbox-data'
import { InboxThreadView, ThreadAvatar } from '@/components/business/dashboard/inbox/inbox-thread'
import { ShellTitle } from '@/components/dash/app-shell'
import { Icon } from '@/components/dash/icons'
import { Button, EmptyState, Notice, Skeleton, cx } from '@/components/dash/ui'
import {
  INBOX_BADGE_LIMIT,
  INBOX_FILTERS,
  INBOX_PAGE_SIZE,
  buildInboxQuery,
  isThreadUnread,
  shortRelativeTime,
  type InboxFilter,
  type InboxThread,
} from '@/lib/business-inbox'

const EMPTY_COPY: Record<InboxFilter, { title: string; body: string }> = {
  needs_reply: {
    title: 'You’re all caught up',
    body: 'New messages from travelers show up here until someone on your team replies.',
  },
  all: {
    title: 'No messages yet',
    body: 'When travelers message you from your Place page, the conversations appear here.',
  },
  archived: {
    title: 'No archived conversations',
    body: 'Archive a conversation to tidy your inbox. It comes back if the traveler writes again.',
  },
  blocked: {
    title: 'No blocked conversations',
    body: 'Blocked travelers can’t message you. You can unblock them at any time.',
  },
}

export function BusinessInboxSection() {
  const { business } = useBusiness()
  const inbox = useInbox()
  const router = useRouter()
  const pathname = usePathname() || ''
  const search = useSearchParams()
  const selectedId = search.get('thread')

  const [filter, setFilterState] = useState<InboxFilter>('needs_reply')
  const [placeFilter, setPlaceFilterState] = useState<string | null>(null)
  const [pageLimit, setPageLimit] = useState(INBOX_PAGE_SIZE)

  const setFilter = (f: InboxFilter) => {
    setFilterState(f)
    setPageLimit(INBOX_PAGE_SIZE)
  }
  const setPlaceFilter = (p: string | null) => {
    setPlaceFilterState(p)
    setPageLimit(INBOX_PAGE_SIZE)
  }

  // The default view (Needs reply, every Place) reuses the badge listener.
  const sharedView = filter === 'needs_reply' && placeFilter === null && pageLimit < INBOX_BADGE_LIMIT
  const spec = useMemo(
    () =>
      sharedView
        ? null
        : buildInboxQuery({
            businessId: business.businessId,
            access: inbox.access,
            filter,
            placeId: placeFilter,
            limit: pageLimit,
          }),
    [sharedView, business.businessId, inbox.access, filter, placeFilter, pageLimit],
  )
  const own = useThreadList(spec)
  const list = sharedView ? inbox.needsReply : own
  const threads = sharedView ? list.threads.slice(0, pageLimit) : list.threads
  const hasMore = sharedView ? list.rawCount > pageLimit : list.rawCount >= pageLimit
  const fullSpec = sharedView
    ? buildInboxQuery({ businessId: business.businessId, access: inbox.access, filter, placeId: null })
    : spec

  const threadHref = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(search.toString())
      if (id) params.set('thread', id)
      else params.delete('thread')
      const qs = params.toString()
      return qs ? `${pathname}?${qs}` : pathname
    },
    [pathname, search],
  )

  const places = business.places
  const multiPlace = places.length > 1
  const showPlaceName = multiPlace && placeFilter === null

  return (
    <>
      <ShellTitle crumbs={[{ label: 'Inbox' }]} />
      <div
        className={cx(
          'flex min-h-[420px] overflow-hidden rounded-[14px] border border-n-line bg-n-surface shadow-n-card',
          'h-[calc(100dvh-5.75rem)] -mb-12 md:h-[calc(100dvh-6.75rem)] md:-mb-10',
          'max-md:-mx-4 max-md:rounded-none max-md:border-x-0',
        )}
      >
        {/* Thread list */}
        <section
          aria-label="Conversations"
          className={cx(
            'flex min-w-0 flex-col border-n-line md:w-[340px] md:shrink-0 md:border-r lg:w-[360px]',
            selectedId ? 'max-md:hidden' : 'w-full',
          )}
        >
          <div className="space-y-3 border-b border-n-line-soft px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-semibold tracking-[-0.01em] text-n-ink">Inbox</h1>
              {multiPlace ? (
                <label className="min-w-0">
                  <span className="sr-only">Place</span>
                  <select
                    value={placeFilter ?? ''}
                    onChange={e => setPlaceFilter(e.target.value || null)}
                    className="h-8 max-w-[180px] truncate rounded-lg border border-n-line-strong bg-n-surface px-2 text-[13px] text-n-ink-2 outline-none focus:border-n-accent max-md:h-10"
                  >
                    <option value="">All places</option>
                    {places.map(p => (
                      <option key={p.placeId} value={p.placeId}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <div role="group" aria-label="Show" className="-mx-1 flex gap-1 overflow-x-auto px-1">
              {INBOX_FILTERS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={filter === f.value}
                  onClick={() => setFilter(f.value)}
                  className={cx(
                    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors max-md:h-10',
                    filter === f.value ? 'bg-n-ink text-white' : 'bg-n-sunken text-n-ink-2 hover:bg-n-hover',
                  )}
                >
                  {f.label}
                  {f.value === 'needs_reply' && inbox.unreadCount > 0 ? (
                    <span
                      className={cx(
                        'rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums',
                        filter === f.value ? 'bg-white/20' : 'bg-n-accent text-white',
                      )}
                    >
                      {inbox.unreadCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.error ? (
              <div className="p-4">
                <Notice tone="danger">{list.error}</Notice>
              </div>
            ) : null}
            {fullSpec?.truncated ? (
              <div className="px-4 pt-3">
                <Notice>Showing your first 30 Places. Pick a Place above to see the others.</Notice>
              </div>
            ) : null}
            {!fullSpec ? (
              <EmptyState icon="pin" title="No Places to show">
                You don’t manage any Places of this business yet. Ask the owner to add you to one.
              </EmptyState>
            ) : list.loading && !threads.length ? (
              <ListSkeleton />
            ) : !threads.length && !list.error ? (
              <EmptyState icon="inbox" title={EMPTY_COPY[filter].title}>
                {EMPTY_COPY[filter].body}
              </EmptyState>
            ) : (
              <ul className="divide-y divide-n-line-soft">
                {threads.map(t => (
                  <li key={t.id}>
                    <ThreadRow
                      thread={t}
                      href={threadHref(t.id)}
                      active={t.id === selectedId}
                      showPlace={showPlaceName}
                    />
                  </li>
                ))}
              </ul>
            )}
            {threads.length && hasMore ? (
              <div className="flex justify-center p-4">
                <Button size="sm" loading={list.loading} onClick={() => setPageLimit(n => n + INBOX_PAGE_SIZE)}>
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        {/* Conversation */}
        <section
          aria-label="Conversation"
          className={cx('min-w-0 flex-1 flex-col', selectedId ? 'flex' : 'hidden md:flex')}
        >
          {selectedId ? (
            <InboxThreadView key={selectedId} threadId={selectedId} onBack={() => router.push(threadHref(null))} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState icon="chat" title="Pick a conversation">
                Choose a conversation on the left to read and reply. Messages are translated for you.
              </EmptyState>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function ThreadRow({
  thread,
  href,
  active,
  showPlace,
}: {
  thread: InboxThread
  href: string
  active: boolean
  showPlace: boolean
}) {
  const unread = isThreadUnread(thread)
  const last = thread.lastMessage
  const preview = last ? `${last.senderRole === 'business' ? 'You: ' : ''}${last.text}` : 'No messages yet'
  const time = shortRelativeTime(last?.createdAtMs ?? thread.updatedAtMs)
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={cx(
        'flex items-start gap-3 px-4 py-3 no-underline transition-colors',
        active ? 'bg-n-accent-soft' : 'hover:bg-n-hover',
      )}
    >
      <ThreadAvatar name={thread.customerName} url={thread.customerAvatar} size={40} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cx('min-w-0 flex-1 truncate text-sm text-n-ink', unread ? 'font-semibold' : 'font-medium')}>
            {thread.customerName}
          </span>
          <span className={cx('shrink-0 text-xs tabular-nums', unread ? 'font-medium text-n-accent-strong' : 'text-n-subtle')}>
            {time}
          </span>
        </span>
        {showPlace || thread.status !== 'open' ? (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-n-subtle">
            {showPlace ? (
              <>
                <Icon name="pin" size={12} className="shrink-0" />
                <span className="truncate">{thread.placeName}</span>
              </>
            ) : null}
            {thread.status !== 'open' ? (
              <span className="shrink-0 rounded-full bg-n-sunken px-1.5 text-[11px] leading-[18px] text-n-ink-2">
                {thread.status === 'blocked' ? 'Blocked' : 'Archived'}
              </span>
            ) : null}
          </span>
        ) : null}
        <span className="mt-0.5 flex items-center gap-2">
          <span className={cx('min-w-0 flex-1 truncate text-[13px]', unread ? 'text-n-ink' : 'text-n-muted')}>{preview}</span>
          {unread ? (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-n-accent">
              <span className="sr-only">Unread</span>
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  )
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading conversations" className="divide-y divide-n-line-soft">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}
