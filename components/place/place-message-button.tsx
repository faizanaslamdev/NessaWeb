'use client'

import Link from 'next/link'

import { Icon } from '@/components/dash/icons'
import { useCustomerThreadsSummary } from '@/components/messages/customer-threads-store'
import { siteButtonClass } from '@/components/site/ui'
import { useAccountAuth } from '@/hooks/use-account-auth'
import type { PublicBusinessProfile } from '@/lib/business-profile'
import { messageButtonAction, newMessageHref } from '@/lib/customer-messages'

/**
 * "Message" on a verified business's Place page. Signed out (anonymous Place
 * Chat guests included) → sign in, then the first-message composer. Signed
 * in → the traveler's existing thread when the shared thread listener has
 * it, else the composer (which checks the full list again).
 */
export function PlaceMessageButton({
  placeId,
  business,
  className,
  variant = 'primary',
}: {
  placeId: string
  business: PublicBusinessProfile
  className?: string
  variant?: 'primary' | 'secondary'
}) {
  const { user, loading } = useAccountAuth()
  const summary = useCustomerThreadsSummary(user?.uid)
  const action = messageButtonAction({ placeId, business, uid: user?.uid ?? null, threads: summary.threads })
  if (action.kind === 'hidden') return null
  // While auth loads, point at the composer: it gates sign-in itself.
  const href = loading ? newMessageHref(placeId) : action.href
  return (
    <Link href={href} className={siteButtonClass(variant, 'md', className)} data-testid="place-message-button">
      <Icon name="chat" size={17} />
      {action.kind === 'thread' && !loading ? 'Open conversation' : 'Message'}
    </Link>
  )
}
