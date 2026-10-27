import type { Metadata } from 'next'

import { BusinessTeamSection } from '@/components/business/dashboard/business-sections'

export const metadata: Metadata = { title: 'Team' }

export default function Page() {
  return <BusinessTeamSection />
}
