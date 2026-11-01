'use client'

import Link from 'next/link'

import { Icon } from '@/components/dash/icons'
import { useBusinessAccess } from '@/components/messages/business-access-store'
import { useCustomerThreadsSummary } from '@/components/messages/customer-threads-store'
import { MessagePanel } from '@/components/place/place-message-panel'
import { siteButtonClass } from '@/components/site/ui'
import { useAccountAuth } from '@/hooks/use-account-auth'
import type { PublicBusinessProfile } from '@/lib/business-profile'
import { messageButtonAction, newMessageHref } from '@/lib/customer-messages'

/**
 * "Message" on a verified business's Place page. Signed out (anonymous Place
 * Chat guests included) → sign in, then the first-message composer. Signed
 * in → the traveler's existing thread when the shared thread listener has
 * it, else the composer (which checks the full list again). Team members of
 * the business get "Open inbox" instead. In the business section
 * (`layout="panel"`) the button comes with copy saying the message is
 * private and where the reply arrives.
 */
export function PlaceMessageButton({
  placeId,
  business,
  className,
  variant = 'primary',
  size = 'md',
  compact = false,
  layout = 'button',
}: {
  placeId: string
  /** Only the fields the visibility rules read (keeps the client props small). */
  business: Pick<PublicBusinessProfile, 'verified' | 'businessId' | 'messagingEnabled' | 'name'>
  className?: string
  variant?: 'primary' | 'secondary'
  size?: 'md' | 'lg'
  /** Phone bottom bar: shorter labels ("Conversation"). */
  compact?: boolean
  /** `panel`: the business section's private-message box (copy + button). */
  layout?: 'button' | 'panel'
}) {
  const { user, loading } = useAccountAuth()
  const summary = useCustomerThreadsSummary(user?.uid)
  const access = useBusinessAccess(user?.uid)
  const action = messageButtonAction({
    placeId,
    business,
    uid: user?.uid ?? null,
    threads: summary.threads,
    teamBusinessIds: access.teamBusinessIds,
  })
  if (action.kind === 'hidden') return null
  // While auth loads, point at the composer: it gates sign-in itself.
  const href = loading ? newMessageHref(placeId) : action.href
  if (layout === 'panel') {
    const kind = action.kind === 'own' ? 'own' : action.kind === 'thread' && !loading ? 'thread' : 'new'
    return <MessagePanel kind={kind} href={href} businessName={business.name} variant={variant} className={className} />
  }
  if (action.kind === 'own') {
    return (
      <Link
        href={action.href}
        aria-label={`Open inbox for ${business.name} (your business)`}
        className={siteButtonClass('secondary', size, className)}
        data-testid="place-own-business-link"
      >
        <Icon name="inbox" size={17} />
        Open inbox
      </Link>
    )
  }
  return (
    <Link
      href={href}
      aria-label={action.kind === 'thread' && !loading ? undefined : `Message ${business.name} privately`}
      className={siteButtonClass(variant, size, className)}
      data-testid="place-message-button"
    >
      <Icon name="mail" size={17} />
      {action.kind === 'thread' && !loading ? (compact ? 'Conversation' : 'Open conversation') : 'Message'}
    </Link>
  )
}
