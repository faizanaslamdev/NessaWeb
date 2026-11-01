/**
 * The "private message" box in a business's section on the Place page. Says
 * plainly who will read the message (only the business's team, in their
 * Nessa inbox) and where the reply comes back (the traveler's Messages).
 *
 * Layout: copy and button share one row while there's room; on narrow
 * phones the button wraps below and fills the width. The 999:1 flex-grow
 * ratio keeps the button its natural width when it sits beside the text.
 */

import Link from 'next/link'

import { Icon, type IconName } from '@/components/dash/icons'
import { siteButtonClass } from '@/components/site/ui'

export type MessagePanelKind = 'new' | 'thread' | 'own'

const COPY: Record<MessagePanelKind, (name: string) => { title: string; body: string; cta: string; icon: IconName }> = {
  new: name => ({
    title: `Message ${name} privately`,
    body: 'Only their team sees it. It goes to their Nessa inbox, and they reply in your Messages.',
    cta: 'Write a message',
    icon: 'mail',
  }),
  thread: name => ({
    title: `Your private chat with ${name}`,
    body: 'Only you and their team can see it. Their replies arrive in your Messages.',
    cta: 'Open conversation',
    icon: 'mail',
  }),
  own: () => ({
    title: 'This is your business',
    body: 'Private messages from guests arrive in your Nessa inbox.',
    cta: 'Open inbox',
    icon: 'inbox',
  }),
}

export function MessagePanel({
  kind,
  href,
  businessName,
  variant = 'primary',
  className,
}: {
  kind: MessagePanelKind
  href: string
  businessName: string
  variant?: 'primary' | 'secondary'
  className?: string
}) {
  const c = COPY[kind](businessName)
  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-n-line bg-n-surface-2 p-4 ${className ?? ''}`}
      data-testid="place-message-panel"
    >
      <div className="flex min-w-0 flex-[999_1_15rem] items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-n-accent-soft text-n-accent max-[360px]:hidden" aria-hidden="true">
          <Icon name={kind === 'own' ? 'inbox' : 'lock'} size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] leading-6 font-semibold text-n-ink [overflow-wrap:anywhere]">{c.title}</p>
          <p className="mt-0.5 text-[13px] leading-5 text-n-muted">{c.body}</p>
        </div>
      </div>
      <Link
        href={href}
        className={siteButtonClass(kind === 'own' ? 'secondary' : variant, 'md', 'grow max-sm:h-11')}
        data-testid={kind === 'own' ? 'place-own-business-link' : 'place-message-button'}
      >
        <Icon name={c.icon} size={17} />
        {c.cta}
      </Link>
    </div>
  )
}
