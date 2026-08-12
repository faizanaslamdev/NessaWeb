import { appStores } from '@/lib/constants'

export type StorePlatform = 'ios' | 'android' | 'desktop'

export function detectStorePlatform(
  userAgent: string | null | undefined =
    typeof navigator !== 'undefined' ? navigator.userAgent : '',
): StorePlatform {
  const ua = (userAgent || '').toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'desktop'
}

export function preferredAppStore(platform: StorePlatform = detectStorePlatform()) {
  if (platform === 'ios') {
    return appStores.find(s => s.name === 'App Store') ?? appStores[0]
  }
  if (platform === 'android') {
    return appStores.find(s => s.name === 'Google Play') ?? appStores[1] ?? appStores[0]
  }
  return null
}

/** Mobile: one primary store. Desktop: both. */
export function storesForPlatform(platform: StorePlatform = detectStorePlatform()) {
  const preferred = preferredAppStore(platform)
  if (preferred) return [preferred]
  return appStores
}
