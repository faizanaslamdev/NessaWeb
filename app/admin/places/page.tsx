import type { Metadata } from 'next'

import { AdminPlacesList } from '@/components/admin/admin-places-list'

export const metadata: Metadata = { title: 'Places' }

/** Admins: every Place (incl. Places without a business, e.g. Cumbuco). */
export default function AdminPlacesPage() {
  return <AdminPlacesList />
}
