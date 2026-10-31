'use client'

import Link from 'next/link'

import { Icon } from '@/components/dash/icons'
import { useBusinessAccess } from '@/components/messages/business-access-store'
import { useCustomerThreadsSummary } from '@/components/messages/customer-threads-store'
import { siteButtonClass } from '@/components/site/ui'
import { useAccountAuth } from '@/hooks/use-account-auth'
import type { PublicBusinessProfile } from '@/lib/business-profile'
import { messageButtonAction, newMessageHref } from '@/lib/customer-messages'

/**
 * "Message" on a verified business's Place page. Signed out (anonymous Place
 * Chat guests included) → sign in, then the first-message composer. Signed
 * in → the traveler's existing thread when the shared thread listener has
 * it, else the composer (which checks the full list again). Team members of
 * the business see "This is your business · Open inbox" instead.
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
  const access = useBusinessAccess(user?.uid)
  const action = messageButtonAction({
    placeId,
    business,
    uid: user?.uid ?? null,
    threads: summary.threads,
    teamBusinessIds: access.teamBusinessIds,
  })
  if (action.kind === 'hidden') return null
  if (action.kind === 'own') {
    return (
      <Link
        href={action.href}
        aria-label={`This is your business. Open the ${business.name} inbox`}
        className="inline-flex min-h-10 items-center gap-1.5 self-center text-[14px] font-semibold text-n-accent-strong no-underline hover:underline max-[400px]:basis-full"
        data-testid="place-own-business-link"
      >
        <Icon name="inbox" size={16} />
        This is your business · Open inbox
      </Link>
    )
  }
  // While auth loads, point at the composer: it gates sign-in itself.
  const href = loading ? newMessageHref(placeId) : action.href
  return (
    <Link href={href} className={siteButtonClass(variant, 'md', className)} data-testid="place-message-button">
      <Icon name="chat" size={17} />
      {action.kind === 'thread' && !loading ? 'Open conversation' : 'Message'}
    </Link>
  )
}
