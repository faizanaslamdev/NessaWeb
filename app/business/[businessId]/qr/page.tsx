import type { Metadata } from 'next'

import { BusinessQrSection } from '@/components/business/dashboard/business-sections'

export const metadata: Metadata = { title: 'QR codes' }

export default function Page() {
  return <BusinessQrSection />
}
