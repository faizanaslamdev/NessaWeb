'use client'

/**
 * /messages — the traveler's conversations with verified businesses.
 * Desktop: list + conversation side by side. Phone (<768px): the list, then
 * the conversation full width (`?thread=` in the URL, so Back returns).
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { Icon } from '@/components/dash/icons'
import { Button, EmptyState, Notice, Skeleton, cx } from '@/components/dash/ui'
import { CustomerThreadView } from '@/components/messages/customer-thread'
import { ThreadAvatar } from '@/components/messaging/conversation'
import { useThreadList } from '@/components/messaging/use-thread-list'
import { useAccountAuth } from '@/hooks/use-account-auth'
import { shortRelativeTime, type BusinessThread } from '@/lib/business-messaging'
import {
  CUSTOMER_THREADS_PAGE,
  MESSAGES_PATH,
  buildCustomerThreadsQuery,
  customerRowLabel,
  customerThreadPreview,
  messageThreadHref,
  threadViewAccess,
  visibleCustomerThreads,
} from '@/lib/customer-messages'

function listErrorCopy(err: unknown): string {
  const code = (err as { code?: unknown })?.code
  if (code === 'failed-precondition') return 'Messages are still being set up. Try again in a few minutes.'
  if (code === 'unavailable') return 'You’re offline. Conversations will update when you reconnect.'
  return 'Couldn’t load your conversations. Refresh the page to try again.'
}

/** Full-height frame below the site header (h-16). */
export function MessagesFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-6xl md:px-6 md:py-6">
      <div className="flex min-h-[420px] min-w-0 flex-1 overflow-hidden border-n-line bg-n-surface max-md:border-t md:rounded-[14px] md:border md:shadow-n-card">
        {children}
      </div>
    </div>
  )
}

export function CustomerMessages() {
  const { user } = useAccountAuth()
  const uid = user?.uid ?? null
  const router = useRouter()
  const search = useSearchParams()
  const selectedId = search.get('thread')
  const started = search.get('started') === '1'

  const [pageLimit, setPageLimit] = useState(CUSTOMER_THREADS_PAGE)
  /** Deleted here, waiting for the server (id → last message time when deleted). */
  const [locallyHidden, setLocallyHidden] = useState<Map<string, number | null>>(() => new Map())

  const spec = useMemo(() => buildCustomerThreadsQuery(uid, pageLimit), [uid, pageLimit])
  const list = useThreadList(spec)
  const threads = useMemo(() => visibleCustomerThreads(list.threads, locallyHidden), [list.threads, locallyHidden])
  const listFull = list.rawCount >= pageLimit
  const listLoaded = !list.loading || list.threads.length > 0

  const access = selectedId
    ? threadViewAccess({ threadId: selectedId, threads: list.threads, listLoaded, listFull, started })
    : null

  const onHidden = (thread: BusinessThread) => {
    setLocallyHidden(m => new Map(m).set(thread.id, thread.lastMessage?.createdAtMs ?? null))
    router.push(MESSAGES_PATH)
  }

  return (
    <MessagesFrame>
      {/* Conversation list */}
      <section
        aria-label="Conversations"
        className={cx(
          'flex min-w-0 flex-col border-n-line md:w-[340px] md:shrink-0 md:border-r lg:w-[360px]',
          selectedId ? 'max-md:hidden' : 'w-full',
        )}
      >
        <div className="border-b border-n-line-soft px-4 pt-4 pb-3">
          <h1 className="text-lg font-semibold tracking-[-0.01em] text-n-ink">Messages</h1>
          <p className="mt-0.5 text-[13px] text-n-muted">Your conversations with verified businesses</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.error ? (
            <div className="p-4">
              <Notice tone="danger">{listErrorCopy(list.error)}</Notice>
            </div>
          ) : null}
          {list.loading && !threads.length ? (
            <ListSkeleton />
          ) : !threads.length && !list.error ? (
            <EmptyState
              icon="chat"
              title="No messages yet"
              action={
                <Link href="/places" className="text-[13px] font-semibold text-n-accent-strong no-underline hover:underline">
                  Explore places
                </Link>
              }
            >
              Message a verified business from its Place page — ask about rooms, prices or opening hours. Messages are
              translated for you.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-n-line-soft">
              {threads.map(t => (
                <li key={t.id}>
                  <ThreadRow thread={t} href={messageThreadHref(t.id)} active={t.id === selectedId} />
                </li>
              ))}
            </ul>
          )}
          {threads.length && listFull ? (
            <div className="flex justify-center p-4">
              <Button size="sm" loading={list.loading} onClick={() => setPageLimit(n => n + CUSTOMER_THREADS_PAGE)}>
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Conversation */}
      <section aria-label="Conversation" className={cx('min-w-0 flex-1 flex-col', selectedId ? 'flex' : 'hidden md:flex')}>
        {selectedId && access === 'listen' ? (
          <CustomerThreadView
            key={selectedId}
            threadId={selectedId}
            onBack={() => router.push(MESSAGES_PATH)}
            onHidden={onHidden}
          />
        ) : selectedId && access === 'wait' ? (
          <div className="p-5" role="status" aria-label="Loading conversation">
            <Skeleton className="mb-3 h-9 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : selectedId ? (
          <div className="flex flex-1 flex-col">
            <div className="border-b border-n-line-soft px-3 py-2 md:hidden">
              <Button size="sm" variant="ghost" icon="chevron-left" onClick={() => router.push(MESSAGES_PATH)}>
                Messages
              </Button>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <EmptyState icon="alert" title="Conversation not found">
                It may have been deleted, or the link is wrong.
              </EmptyState>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon="chat" title="Pick a conversation">
              Choose a conversation on the left. Replies from businesses are translated into your language.
            </EmptyState>
          </div>
        )}
      </section>
    </MessagesFrame>
  )
}

function ThreadRow({ thread, href, active }: { thread: BusinessThread; href: string; active: boolean }) {
  const unread = thread.customerUnread > 0
  const label = customerRowLabel(thread)
  const time = shortRelativeTime(thread.lastMessage?.createdAtMs ?? thread.updatedAtMs)
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={cx('flex items-start gap-3 px-4 py-3 no-underline transition-colors', active ? 'bg-n-accent-soft' : 'hover:bg-n-hover')}
    >
      <ThreadAvatar name={thread.businessName} url={thread.businessLogoUrl} size={40} square />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cx('flex min-w-0 flex-1 items-center gap-1 text-sm text-n-ink', unread ? 'font-semibold' : 'font-medium')}>
            <span className="truncate">{thread.businessName}</span>
            <Icon name="check" size={13} strokeWidth={2.5} className="shrink-0 text-n-accent-strong" />
            <span className="sr-only">(verified business)</span>
          </span>
          <span className={cx('shrink-0 text-xs tabular-nums', unread ? 'font-medium text-n-accent-strong' : 'text-n-subtle')}>{time}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-n-subtle">
          <Icon name="pin" size={12} className="shrink-0" />
          <span className="truncate">{thread.placeName}</span>
          {label ? (
            <span className="shrink-0 rounded-full bg-n-sunken px-1.5 text-[11px] leading-[18px] text-n-ink-2">{label}</span>
          ) : null}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={cx('min-w-0 flex-1 truncate text-[13px]', unread ? 'text-n-ink' : 'text-n-muted')}>
            {customerThreadPreview(thread)}
          </span>
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
          <Skeleton className="h-10 w-10 shrink-0 rounded-[10px]" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}
