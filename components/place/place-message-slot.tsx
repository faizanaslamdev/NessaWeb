'use client'

/**
 * The Place page's Message button, loaded after the page: it needs the
 * signed-in state (Firebase Auth + the traveler's threads), so the Firebase
 * SDK stays out of the page's first JavaScript. Until it loads, travelers
 * see the same "Message" link (or private-message box) pointing at the
 * composer, which handles sign-in itself; the business's team then gets
 * "Open inbox".
 */

import { Suspense, lazy, type ComponentProps } from 'react'
import Link from 'next/link'

import { Icon } from '@/components/dash/icons'
import { MessagePanel } from '@/components/place/place-message-panel'
import { siteButtonClass } from '@/components/site/ui'
import { canMessageBusiness, newMessageHref } from '@/lib/customer-messages'

const PlaceMessageButton = lazy(() =>
  import('@/components/place/place-message-button').then(m => ({ default: m.PlaceMessageButton })),
)

type Props = ComponentProps<typeof PlaceMessageButton>

function Placeholder({ placeId, business, className, variant = 'primary', size = 'md', layout = 'button' }: Props) {
  if (!canMessageBusiness(business)) return null
  if (layout === 'panel') {
    return <MessagePanel kind="new" href={newMessageHref(placeId)} businessName={business.name} variant={variant} className={className} />
  }
  return (
    <Link href={newMessageHref(placeId)} className={siteButtonClass(variant, size, className)} data-testid="place-message-button">
      <Icon name="mail" size={17} />
      Message
    </Link>
  )
}

export function PlaceMessageSlot(props: Props) {
  return (
    <Suspense fallback={<Placeholder {...props} />}>
      <PlaceMessageButton {...props} />
    </Suspense>
  )
}
