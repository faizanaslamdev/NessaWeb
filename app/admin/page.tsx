import type { Metadata } from 'next'

import { AdminOverview } from '@/components/admin/admin-overview'

export const metadata: Metadata = { title: { absolute: 'Overview · NessaChat Admin' } }

export default function AdminOverviewPage() {
  return <AdminOverview />
}
