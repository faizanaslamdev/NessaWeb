import type { Metadata } from 'next'

import { BusinessInboxSection } from '@/components/business/dashboard/inbox/business-inbox'

export const metadata: Metadata = { title: 'Inbox' }

export default function Page() {
  return <BusinessInboxSection />
}
