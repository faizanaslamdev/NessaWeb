import type { Metadata } from 'next'

import { AdminPlaceDetail } from '@/components/admin/admin-place-detail'

type PageProps = { params: Promise<{ placeId: string }> }

export const metadata: Metadata = { title: 'Place' }

export default async function AdminPlacePage({ params }: PageProps) {
  const { placeId } = await params
  return <AdminPlaceDetail placeId={decodeURIComponent(placeId).trim()} />
}
