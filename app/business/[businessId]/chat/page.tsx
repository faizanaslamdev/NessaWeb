import type { Metadata } from 'next'

import { BusinessChatSection } from '@/components/business/dashboard/business-sections'

export const metadata: Metadata = { title: 'Live chat' }

export default function Page() {
  return <BusinessChatSection />
}
