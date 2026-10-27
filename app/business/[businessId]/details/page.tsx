import type { Metadata } from 'next'

import { BusinessDetailsSection } from '@/components/business/dashboard/business-sections'

export const metadata: Metadata = { title: 'Business details' }

export default function Page() {
  return <BusinessDetailsSection />
}
