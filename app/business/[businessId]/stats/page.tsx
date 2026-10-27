import type { Metadata } from 'next'

import { BusinessStatsSection } from '@/components/business/dashboard/business-sections'

export const metadata: Metadata = { title: 'Stats' }

export default function Page() {
  return <BusinessStatsSection />
}
