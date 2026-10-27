/**
 * Official (business / staff) label for Place Chat messages. The flag is set
 * by `sendPlaceChatMessage` on the server for verified business members; the
 * web only renders it. Pure so it can be unit-tested.
 */

export const OFFICIAL_BADGE_NAME_MAX = 28

export function officialSenderBadge(message: {
  official?: boolean
  businessName?: string
}): string | undefined {
  if (message.official !== true) {
    return undefined
  }
  const name = (message.businessName ?? '').trim()
  if (!name) {
    return 'Official'
  }
  const short =
    name.length > OFFICIAL_BADGE_NAME_MAX
      ? `${name.slice(0, OFFICIAL_BADGE_NAME_MAX - 1).trimEnd()}…`
      : name
  return `${short} · Official`
}
