import type { Metadata } from 'next'

import { BusinessGuestsSection } from '@/components/business/dashboard/business-sections'

export const metadata: Metadata = { title: 'Guest info' }

export default function Page() {
  return <BusinessGuestsSection />
}
