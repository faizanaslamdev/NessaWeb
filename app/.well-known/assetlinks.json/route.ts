import {NextResponse} from 'next/server'

/**
 * Digital Asset Links for Android App Links verification.
 *
 * Fingerprints (SHA-256, colon-separated):
 * 1. Upload / local release keystore (`android/app/release.keystore`, alias nessa-release)
 * 2. Google Play App Signing certificate (production installs from Play)
 */
const UPLOAD_RELEASE_SHA256 =
  'E6:B8:C5:C7:8B:BB:FF:D1:35:62:8E:7C:C8:2F:FF:75:06:ED:C5:A8:44:8F:E5:BE:FA:B4:84:8C:32:BA:63:27'

const PLAY_APP_SIGNING_SHA256 =
  '63:CE:12:39:5A:04:5D:76:5B:D2:A4:56:44:FA:F6:F9:6E:1A:41:EF:24:64:32:ED:F0:00:5A:69:75:9E:B5:42'

const ASSET_LINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.nessachat',
      sha256_cert_fingerprints: [
        UPLOAD_RELEASE_SHA256,
        PLAY_APP_SIGNING_SHA256,
      ],
    },
  },
]

export async function GET() {
  return NextResponse.json(ASSET_LINKS, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
