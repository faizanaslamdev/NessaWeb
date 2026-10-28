import type { Metadata } from 'next'

import { BusinessPhotosSection } from '@/components/business/dashboard/business-sections'

export const metadata: Metadata = { title: 'Photos' }

export default function Page() {
  return <BusinessPhotosSection />
}
