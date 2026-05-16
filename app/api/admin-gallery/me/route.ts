import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { ADMIN_GALLERY_COOKIE, verifyAdminGallerySession } from '@/lib/admin-gallery-session'

export async function GET() {
  const secret = process.env.ADMIN_GALLERY_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, configured: false })
  }
  const jar = await cookies()
  const token = jar.get(ADMIN_GALLERY_COOKIE)?.value
  const ok = verifyAdminGallerySession(token, secret)
  return NextResponse.json({ ok, configured: true })
}
