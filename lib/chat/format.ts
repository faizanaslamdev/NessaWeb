/** For read-only share URL fields: hide scheme in the UI; copy handlers should still write the full URL. */
export function shareUrlWithoutScheme(url: string): string {
  return url.replace(/^https?:\/\//i, '')
}

export function formatLastSeenShort(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function formatMessageTime(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return ''
  return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
