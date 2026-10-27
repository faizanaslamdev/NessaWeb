import type { Metadata } from 'next'

import { AdminClaims } from '@/components/business/admin-claims'

export const metadata: Metadata = { title: 'Business claims' }

/** Admins review business claims; `runBusinessAdminOps` enforces the role. */
export default function AdminBusinessPage() {
  return <AdminClaims />
}
