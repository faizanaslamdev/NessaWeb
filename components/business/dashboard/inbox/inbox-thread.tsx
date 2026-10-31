'use client'

/**
 * One customer conversation in the Business Inbox: live messages (with day
 * separators, translations and read receipts), the reply composer with
 * optimistic sends, and archive / block / report. The conversation pieces
 * are shared with the traveler's /messages (components/messaging).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { sendEmailVerification } from 'firebase/auth'

import { useBusiness } from '@/components/business/dashboard/business-shell'
import { useViewerStaffId } from '@/components/business/dashboard/inbox/inbox-data'
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
  languageName,
  useConversation,
  useMarkThreadRead,
} from '@/components/messaging/conversation'
import {
  businessSideTranslation,
  describeInboxError,
  readReceipt,
  staffComposerState,
  staffSenderLabel,
  type InboxMessage,
  type InboxThread,
} from '@/lib/business-inbox'
import {
  manageBusinessThread,
  sendBusinessMessage,
  subscribeThread,
  type StaffThreadAction,
} from '@/lib/business-messaging-api'
import type { TimelineItem } from '@/lib/business-messaging'
import { AUTH_EMAIL_ACTION_CODE_SETTINGS } from '@/lib/account/constants'
import { getFirebaseClient } from '@/lib/firebase'

type LoadState = 'loading' | 'ready' | 'missing' | 'error'
type Banner = { tone: 'ok' | 'danger' | 'neutral'; text: string } | null

const ACTION_DONE: Record<StaffThreadAction, (name: string) => string> = {
  archive: name => `Archived. It comes back to your inbox if ${name} writes again.`,
  unarchive: () => 'Moved back to your inbox.',
  block: name => `Blocked. ${name} can’t message you until you unblock them.`,
  unblock: () => 'Unblocked. You can message each other again.',
  report: () => 'Thanks — the NessaChat team will review this conversation.',
}

export function InboxThreadView({ threadId, onBack }: { threadId: string; onBack: () => void }) {
  const { business } = useBusiness()

  const [thread, setThread] = useState<InboxThread | null>(null)
  const [threadState, setThreadState] = useState<LoadState>('loading')
  const [banner, setBanner] = useState<Banner>(null)
  const [needsVerify, setNeedsVerify] = useState(false)
  /** A reply was refused with business/blocked-by-customer before the listener caught up. */
  const [blockedByCustomer, setBlockedByCustomer] = useState(false)
  const [busyAction, setBusyAction] = useState<StaffThreadAction | null>(null)
  const [dialog, setDialog] = useState<null | 'block' | 'unblock' | 'report'>(null)

  useEffect(
    () =>
      subscribeThread(
        threadId,
        t => {
          setThread(t)
          setThreadState(t ? 'ready' : 'missing')
          if (t && !t.customerBlocked) setBlockedByCustomer(false)
        },
        err => setThreadState((err as { code?: string })?.code === 'permission-denied' ? 'missing' : 'error'),
      ),
    [threadId],
  )

  const deliver = useCallback(
    async ({ clientId, text }: { clientId: string; text: string }) => {
      try {
        await sendBusinessMessage({ threadId, text, clientId })
        return null
      } catch (err) {
        const info = describeInboxError(err, 'Message not sent. Check your connection and try again.')
        if (info.code === 'business/email-not-verified') setNeedsVerify(true)
        if (info.code === 'business/blocked-by-customer') setBlockedByCustomer(true)
        return info.message
      }
    },
    [threadId],
  )
  const conversation = useConversation(threadId, deliver)

  useMarkThreadRead({
    threadId,
    viewer: 'business',
    thread,
    messages: conversation.messages,
    loaded: conversation.loaded,
    onError: err => {
      if (describeInboxError(err).code === 'business/email-not-verified') setNeedsVerify(true)
    },
  })

  const runAction = async (action: StaffThreadAction, reason?: string) => {
    setBusyAction(action)
    setBanner(null)
    try {
      await manageBusinessThread({ threadId, action, ...(reason ? { reason } : {}) })
      setBanner({ tone: 'ok', text: ACTION_DONE[action](thread?.customerName ?? 'The traveler') })
      setDialog(null)
    } catch (err) {
      const info = describeInboxError(err, 'That didn’t work. Please try again.')
      if (info.code === 'business/email-not-verified') setNeedsVerify(true)
      setBanner({ tone: 'danger', text: info.message })
      setDialog(null)
    } finally {
      setBusyAction(null)
    }
  }

  const receipt = useMemo(
    () => readReceipt(conversation.messages, thread?.customerLastReadAtMs ?? null),
    [conversation.messages, thread?.customerLastReadAtMs],
  )
  const businessLanguage = thread?.businessLanguage ?? 'en'
  const translate = useCallback((m: InboxMessage) => businessSideTranslation(m, businessLanguage), [businessLanguage])
  // "Casa · You" / "Casa · Team" above each run of business messages (staffIds, never uids).
  const viewerStaffId = useViewerStaffId(business.businessId)
  const businessName = thread?.businessName ?? ''
  const ownRunLabel = useCallback(
    (item: TimelineItem) => {
      const who = item.kind === 'pending' ? 'You' : staffSenderLabel(item.message, viewerStaffId)
      return businessName ? `${businessName} · ${who}` : (who ?? undefined)
    },
    [businessName, viewerStaffId],
  )

  if (threadState === 'loading') {
    return <LoadingBlock label="Loading conversation…" rows={5} />
  }
  if (threadState !== 'ready' || !thread) {
    return (
      <div className="flex flex-1 flex-col">
        <BackBar onBack={onBack} />
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="alert" title={threadState === 'error' ? 'Couldn’t load this conversation' : 'Conversation not found'}>
            {threadState === 'error'
              ? 'Check your connection and refresh the page.'
              : 'It may belong to a Place you don’t manage, or the link is wrong.'}
          </EmptyState>
        </div>
      </div>
    )
  }

  const composerState = staffComposerState(thread, blockedByCustomer)
  const blocked = thread.status === 'blocked'
  const archived = thread.status === 'archived'
  const lang = languageName(thread.customerLanguage)
  const messagingOff = business.profile.messagingEnabled === false

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-n-line-soft px-3 py-2.5 md:px-5">
        <IconButton icon="chevron-left" label="Back to conversations" onClick={onBack} className="md:hidden" />
        <ThreadAvatar name={thread.customerName} url={thread.customerAvatar} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-n-ink">{thread.customerName}</p>
          <p className="truncate text-xs text-n-subtle">
            {thread.placeName}
            {lang ? ` · Writes in ${lang}` : ''}
          </p>
        </div>
        <ThreadActions
          status={thread.status}
          busy={busyAction}
          onArchive={() => void runAction(archived ? 'unarchive' : 'archive')}
          onBlock={() => setDialog(blocked ? 'unblock' : 'block')}
          onReport={() => setDialog('report')}
        />
      </header>

      {banner ? (
        <div className="px-3 pt-3 md:px-5">
          <Notice
            tone={banner.tone}
            action={<IconButton icon="x" label="Dismiss" size={28} onClick={() => setBanner(null)} />}
          >
            {banner.text}
          </Notice>
        </div>
      ) : null}
      {needsVerify ? (
        <div className="px-3 pt-3 md:px-5">
          <VerifyEmailNotice businessName={thread.businessName} onDone={() => setNeedsVerify(false)} />
        </div>
      ) : null}

      <MessageTimeline
        conversation={conversation}
        viewer="business"
        ownRunLabel={ownRunLabel}
        translate={translate}
        receipt={receipt}
      />

      {/* Composer */}
      <div className="border-t border-n-line-soft bg-n-surface px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-5">
        {composerState === 'blocked' ? (
          <Notice
            tone="warn"
            title="You blocked this conversation"
            action={
              <Button size="sm" onClick={() => setDialog('unblock')}>
                Unblock
              </Button>
            }
          >
            {thread.customerName} can’t message you, and replies are turned off. Unblock to talk again.
          </Notice>
        ) : composerState === 'customer-blocked' ? (
          <Notice tone="neutral" title={`${thread.customerName} blocked messages from you`}>
            The traveler turned off messages from {thread.businessName}, so replies are disabled. You can still read the
            conversation{archived ? '' : ' and archive it'}. If they unblock you, you can reply again.
          </Notice>
        ) : (
          <>
            {archived ? (
              <p className="mb-2 text-xs text-n-subtle">Archived — replying moves this conversation back to your inbox.</p>
            ) : messagingOff ? (
              <p className="mb-2 text-xs text-n-subtle">
                Messaging is turned off for your business. {thread.customerName} can’t send new messages, but your replies still arrive.
              </p>
            ) : null}
            <Composer
              label={`Reply as ${thread.businessName}`}
              placeholder={`Reply as ${thread.businessName}…`}
              hint="Translated for the traveler"
              onSend={conversation.send}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'block' || dialog === 'unblock'}
        title={dialog === 'unblock' ? `Unblock ${thread.customerName}?` : `Block ${thread.customerName}?`}
        description={
          dialog === 'unblock'
            ? `${thread.customerName} will be able to message you again, and your team can reply.`
            : `${thread.customerName} won’t be able to send you messages, and your team can’t reply until you unblock. They aren’t told they were blocked.`
        }
        confirmLabel={dialog === 'unblock' ? 'Unblock' : 'Block'}
        danger={dialog !== 'unblock'}
        busy={busyAction === 'block' || busyAction === 'unblock'}
        onClose={() => setDialog(null)}
        onConfirm={() => void runAction(dialog === 'unblock' ? 'unblock' : 'block')}
      />
      <ReportDialog
        open={dialog === 'report'}
        name={thread.customerName}
        description="Tell us what’s wrong — spam, abuse, scams. The NessaChat team reviews every report. Reporting doesn’t block the conversation."
        busy={busyAction === 'report'}
        onClose={() => setDialog(null)}
        onSubmit={reason => void runAction('report', reason)}
      />
    </div>
  )
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="border-b border-n-line-soft px-3 py-2 md:hidden">
      <Button size="sm" variant="ghost" icon="chevron-left" onClick={onBack}>
        Conversations
      </Button>
    </div>
  )
}

function ThreadActions({
  status,
  busy,
  onArchive,
  onBlock,
  onReport,
}: {
  status: InboxThread['status']
  busy: StaffThreadAction | null
  onArchive: () => void
  onBlock: () => void
  onReport: () => void
}) {
  const [open, setOpen, ref] = usePopover<HTMLDivElement>()
  const archived = status === 'archived'
  const blocked = status === 'blocked'
  return (
    <div className="flex shrink-0 items-center gap-1">
      {!blocked ? (
        <Button
          size="sm"
          variant="secondary"
          icon={archived ? 'inbox' : 'archive'}
          loading={busy === 'archive' || busy === 'unarchive'}
          onClick={onArchive}
          className="max-sm:hidden"
        >
          {archived ? 'Move to inbox' : 'Archive'}
        </Button>
      ) : null}
      <div ref={ref} className="relative">
        <IconButton
          icon="more"
          label="More actions"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        />
        {open ? (
          <div role="menu" className={cx(menuPanelClass, 'right-0')}>
            {!blocked ? (
              <button
                type="button"
                role="menuitem"
                className={cx(menuItemClass, 'sm:hidden')}
                onClick={() => {
                  setOpen(false)
                  onArchive()
                }}
              >
                <Icon name={archived ? 'inbox' : 'archive'} size={16} />
                {archived ? 'Move to inbox' : 'Archive'}
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                setOpen(false)
                onBlock()
              }}
            >
              <Icon name="ban" size={16} />
              {blocked ? 'Unblock' : 'Block'}
            </button>
            <button
              type="button"
              role="menuitem"
              className={cx(menuItemClass, 'text-n-danger hover:text-n-danger')}
              onClick={() => {
                setOpen(false)
                onReport()
              }}
            >
              <Icon name="flag" size={16} />
              Report
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * The callables require a verified email for staff. The dashboard already
 * gates on one, so this is usually a stale sign-in token: refresh it.
 */
function VerifyEmailNotice({ businessName, onDone }: { businessName: string; onDone: () => void }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'still'>('idle')
  const check = async () => {
    setState('busy')
    try {
      const user = getFirebaseClient().auth.currentUser
      await user?.reload()
      if (user?.emailVerified) {
        await user.getIdToken(true)
        onDone()
        return
      }
      setState('still')
    } catch {
      setState('still')
    }
  }
  const resend = async () => {
    setState('busy')
    try {
      const user = getFirebaseClient().auth.currentUser
      if (user && !user.isAnonymous) await sendEmailVerification(user, AUTH_EMAIL_ACTION_CODE_SETTINGS)
      setState('sent')
    } catch {
      setState('still')
    }
  }
  return (
    <Notice tone="warn" title="Verify your email to reply">
      <p>
        To reply as {businessName}, your account’s email address must be verified.
        {state === 'sent' ? ' We sent you a new link — open it, then press “I’ve verified”.' : ''}
        {state === 'still' ? ' It isn’t verified yet — open the link in the email first.' : ''}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" loading={state === 'busy'} onClick={() => void check()}>
          I’ve verified
        </Button>
        <Button size="sm" onClick={() => void resend()} disabled={state === 'busy'}>
          Send a new link
        </Button>
      </div>
    </Notice>
  )
}
