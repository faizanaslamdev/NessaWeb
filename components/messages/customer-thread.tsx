'use client'

/**
 * One conversation with a business, traveler side: live messages (translated
 * into the traveler's language, "Show original"), optimistic sends with
 * retry, "Seen", mark-read while visible, and block / report / delete.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { Icon } from '@/components/dash/icons'
import {
  Button,
  EmptyState,
  IconButton,
  LoadingBlock,
  Notice,
  cx,
  menuItemClass,
  menuPanelClass,
  usePopover,
} from '@/components/dash/ui'
import {
  Composer,
  ConfirmDialog,
  MessageTimeline,
  ReportDialog,
  ThreadAvatar,
  useConversation,
  useMarkThreadRead,
} from '@/components/messaging/conversation'
import { VerifiedBadge } from '@/components/place/place-official-section'
import {
  describeMessagingError,
  readReceiptFor,
  translationFor,
  type BusinessMessage,
  type BusinessThread,
} from '@/lib/business-messaging'
import {
  manageBusinessThread,
  readBusinessMessagingEnabled,
  sendBusinessMessage,
  subscribeThread,
  type CustomerThreadAction,
} from '@/lib/business-messaging-api'
import { customerComposerState } from '@/lib/customer-messages'

type LoadState = 'loading' | 'ready' | 'missing' | 'error'
type Banner = { tone: 'ok' | 'danger'; text: string } | null
type DialogKind = null | 'block' | 'unblock' | 'report' | 'hide'

const ACTION_DONE: Partial<Record<CustomerThreadAction, (name: string) => string>> = {
  block: name => `Blocked. ${name} can’t message you until you unblock them.`,
  unblock: name => `Unblocked. You and ${name} can message each other again.`,
  report: () => 'Thanks — the NessaChat team will review this conversation.',
}

export function CustomerThreadView({
  threadId,
  onBack,
  onHidden,
}: {
  threadId: string
  onBack: () => void
  /** The conversation was deleted (hidden) — leave it. */
  onHidden: (thread: BusinessThread) => void
}) {
  const [thread, setThread] = useState<BusinessThread | null>(null)
  const [threadState, setThreadState] = useState<LoadState>('loading')
  const [messagingEnabled, setMessagingEnabled] = useState(true)
  /** A send was refused with business/thread-blocked. */
  const [refusedAsBlocked, setRefusedAsBlocked] = useState(false)
  const [banner, setBanner] = useState<Banner>(null)
  const [busy, setBusy] = useState<CustomerThreadAction | null>(null)
  const [dialog, setDialog] = useState<DialogKind>(null)

  useEffect(
    () =>
      subscribeThread(
        threadId,
        t => {
          setThread(t)
          setThreadState(t ? 'ready' : 'missing')
        },
        err => setThreadState((err as { code?: string })?.code === 'permission-denied' ? 'missing' : 'error'),
      ),
    [threadId],
  )

  // Whether the business still accepts messages (businesses/{id} is readable when signed in).
  const businessId = thread?.businessId ?? ''
  useEffect(() => {
    if (!businessId) return
    let cancelled = false
    void readBusinessMessagingEnabled(businessId).then(enabled => {
      if (!cancelled) setMessagingEnabled(enabled)
    })
    return () => {
      cancelled = true
    }
  }, [businessId])

  const deliver = useCallback(
    async ({ clientId, text }: { clientId: string; text: string }) => {
      try {
        await sendBusinessMessage({ threadId, text, clientId })
        return null
      } catch (err) {
        const info = describeMessagingError(err, 'customer', 'Message not sent. Check your connection and try again.')
        if (info.code === 'business/thread-blocked') setRefusedAsBlocked(true)
        if (info.code === 'business/messaging-disabled') setMessagingEnabled(false)
        return info.message
      }
    },
    [threadId],
  )
  const conversation = useConversation(threadId, deliver)

  useMarkThreadRead({
    threadId,
    viewer: 'customer',
    thread,
    messages: conversation.messages,
    loaded: conversation.loaded,
  })

  const receipt = useMemo(
    () => readReceiptFor(conversation.messages, 'customer', thread?.businessLastReadAtMs ?? null),
    [conversation.messages, thread?.businessLastReadAtMs],
  )
  const language = thread?.customerLanguage ?? null
  const translate = useCallback((m: BusinessMessage) => translationFor(m, 'customer', language), [language])

  const run = async (action: CustomerThreadAction, reason?: string) => {
    if (!thread) return
    setBusy(action)
    setBanner(null)
    try {
      await manageBusinessThread({ threadId, action, ...(reason ? { reason } : {}) })
      setDialog(null)
      if (action === 'hide') {
        onHidden(thread)
        return
      }
      const done = ACTION_DONE[action]
      if (done) setBanner({ tone: 'ok', text: done(thread.businessName) })
      if (action === 'unblock') setRefusedAsBlocked(false)
    } catch (err) {
      setDialog(null)
      setBanner({ tone: 'danger', text: describeMessagingError(err, 'customer', 'That didn’t work. Please try again.').message })
    } finally {
      setBusy(null)
    }
  }

  if (threadState === 'loading') {
    return <LoadingBlock label="Loading conversation…" rows={5} />
  }
  if (threadState !== 'ready' || !thread) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="border-b border-n-line-soft px-3 py-2 md:hidden">
          <Button size="sm" variant="ghost" icon="chevron-left" onClick={onBack}>
            Messages
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="alert" title={threadState === 'error' ? 'Couldn’t load this conversation' : 'Conversation not found'}>
            {threadState === 'error' ? 'Check your connection and refresh the page.' : 'It may have been deleted, or the link is wrong.'}
          </EmptyState>
        </div>
      </div>
    )
  }

  const state = customerComposerState({ thread, messagingEnabled, refusedAsBlocked })
  const name = thread.businessName

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-n-line-soft px-3 py-2.5 md:px-5">
        <IconButton icon="chevron-left" label="Back to messages" onClick={onBack} className="md:hidden" />
        <ThreadAvatar name={name} url={thread.businessLogoUrl} size={36} square />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-n-ink">{name}</span>
            <VerifiedBadge className="shrink-0 max-sm:hidden" />
          </p>
          <Link
            href={`/place/${encodeURIComponent(thread.placeId)}`}
            className="block truncate text-xs text-n-subtle no-underline hover:text-n-ink hover:underline"
          >
            {thread.placeName}
          </Link>
        </div>
        <ThreadMenu
          blocked={thread.customerBlocked}
          onBlock={() => setDialog(thread.customerBlocked ? 'unblock' : 'block')}
          onReport={() => setDialog('report')}
          onHide={() => setDialog('hide')}
        />
      </header>

      {banner ? (
        <div className="px-3 pt-3 md:px-5">
          <Notice tone={banner.tone} action={<IconButton icon="x" label="Dismiss" size={28} onClick={() => setBanner(null)} />}>
            {banner.text}
          </Notice>
        </div>
      ) : null}

      <MessageTimeline
        conversation={conversation}
        viewer="customer"
        otherRunLabel={name}
        translate={translate}
        receipt={receipt}
        empty={<EmptyState icon="chat" title="No messages yet" compact />}
      />

      <div className="border-t border-n-line-soft bg-n-surface px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-5">
        {state === 'you-blocked' ? (
          <Notice
            tone="warn"
            title={`You blocked ${name}`}
            action={
              <Button size="sm" onClick={() => setDialog('unblock')}>
                Unblock
              </Button>
            }
          >
            They can’t message you, and you can’t send messages here until you unblock them.
          </Notice>
        ) : state === 'business-blocked' ? (
          <Notice tone="neutral" title={`${name} isn’t accepting messages from you`}>
            You can still read this conversation, but new messages won’t be delivered.
          </Notice>
        ) : state === 'messaging-off' ? (
          <Notice tone="neutral" title={`${name} has turned off messages`}>
            You can still read this conversation. To reach them, use the contact details on their Place page.
          </Notice>
        ) : (
          <Composer
            label={`Message ${name}`}
            placeholder={`Message ${name}…`}
            hint={`Translated for ${name}`}
            onSend={conversation.send}
          />
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'block' || dialog === 'unblock'}
        title={dialog === 'unblock' ? `Unblock ${name}?` : `Block ${name}?`}
        description={
          dialog === 'unblock'
            ? `You and ${name} will be able to message each other again.`
            : `${name} won’t be able to message you, and you won’t be able to message them until you unblock. You can unblock at any time from this conversation.`
        }
        confirmLabel={dialog === 'unblock' ? 'Unblock' : 'Block'}
        danger={dialog !== 'unblock'}
        busy={busy === 'block' || busy === 'unblock'}
        onClose={() => setDialog(null)}
        onConfirm={() => void run(dialog === 'unblock' ? 'unblock' : 'block')}
      />
      <ConfirmDialog
        open={dialog === 'hide'}
        title="Delete this conversation?"
        description={`It’s removed from your messages. If ${name} replies, it comes back. ${name} keeps their copy.`}
        confirmLabel="Delete"
        danger
        busy={busy === 'hide'}
        onClose={() => setDialog(null)}
        onConfirm={() => void run('hide')}
      />
      <ReportDialog
        open={dialog === 'report'}
        name={name}
        description="Tell us what’s wrong — spam, abuse, scams. The NessaChat team reviews every report. Reporting doesn’t block the business; you can do that from the menu."
        busy={busy === 'report'}
        onClose={() => setDialog(null)}
        onSubmit={reason => void run('report', reason)}
      />
    </div>
  )
}

function ThreadMenu({
  blocked,
  onBlock,
  onReport,
  onHide,
}: {
  blocked: boolean
  onBlock: () => void
  onReport: () => void
  onHide: () => void
}) {
  const [open, setOpen, ref] = usePopover<HTMLDivElement>()
  const item = (label: string, icon: 'ban' | 'flag' | 'trash', onClick: () => void, danger = false) => (
    <button
      type="button"
      role="menuitem"
      className={cx(menuItemClass, danger ? 'text-n-danger hover:text-n-danger' : '')}
      onClick={() => {
        setOpen(false)
        onClick()
      }}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  )
  return (
    <div ref={ref} className="relative shrink-0">
      <IconButton icon="more" label="Conversation actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)} />
      {open ? (
        <div role="menu" className={cx(menuPanelClass, 'right-0')}>
          {item(blocked ? 'Unblock business' : 'Block business', 'ban', onBlock)}
          {item('Report', 'flag', onReport, true)}
          {item('Delete conversation', 'trash', onHide, true)}
        </div>
      ) : null}
    </div>
  )
}
