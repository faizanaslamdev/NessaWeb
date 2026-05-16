import crypto from 'node:crypto'

export const ADMIN_GALLERY_COOKIE = 'nessa_admin_gallery'

/** Signed cookie: `${expMs}.${hmac}` — verified with ADMIN_GALLERY_SECRET */
export function signAdminGallerySession(secret: string, ttlMs: number): string {
  const exp = Date.now() + ttlMs
  const payload = String(exp)
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${exp}.${hmac}`
}

export function verifyAdminGallerySession(token: string | undefined, secret: string): boolean {
  if (!token || !secret) {
    return false
  }
  const idx = token.indexOf('.')
  if (idx <= 0) {
    return false
  }
  const expStr = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return false
  }
  const expected = crypto.createHmac('sha256', secret).update(expStr).digest('hex')
  try {
    const a = Buffer.from(sig, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) {
      return false
    }
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}
