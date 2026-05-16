import { NextResponse } from 'next/server'

import { ADMIN_GALLERY_COOKIE, signAdminGallerySession } from '@/lib/admin-gallery-session'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  const password = process.env.ADMIN_GALLERY_PASSWORD
  const secret = process.env.ADMIN_GALLERY_SECRET
  if (!password || !secret) {
    return NextResponse.json({ error: 'Admin gallery is not configured' }, { status: 503 })
  }

  let body: { password?: string }
  try {
    body = (await request.json()) as { password?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const submitted = typeof body.password === 'string' ? body.password : ''
  if (submitted !== password) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = signAdminGallerySession(secret, SESSION_TTL_MS)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_GALLERY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
  return res
}
