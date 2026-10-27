import type { Metadata } from 'next'

import { BusinessHomeDashboard } from '@/components/business/dashboard/business-home'

export const metadata: Metadata = { title: { absolute: 'Home · NessaChat Business' } }

export default function BusinessDashboardHome() {
  return <BusinessHomeDashboard />
}
