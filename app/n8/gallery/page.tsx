import type { Metadata } from 'next'

import AdminGalleryClient from './admin-gallery-client'

export const metadata: Metadata = {
  title: 'Admin Gallery | NessaChat',
  robots: { index: false, follow: false },
}

export default function AdminGalleryPage() {
  return <AdminGalleryClient />
}
