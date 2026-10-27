import {NextResponse} from 'next/server'

import {PLACE_LINKS_USE_LEGACY_ID_PATH} from '@/lib/place-slug'

/**
 * Apple App Site Association for Universal Links.
 * Content-Type must be application/json (Apple accepts this for AASA).
 *
 * appID = Apple Team ID + "." + bundle ID (from Xcode DEVELOPMENT_TEAM).
 *
 * Paths: the legacy `/place/{id}` page (+ `/chat`) is always an app link.
 * The canonical `/places/{slug}` pages are added only once the slug-aware
 * app release is widely installed — the same moment the web stops handing
 * out legacy links (`PLACE_LINKS_USE_LEGACY_ID_PATH = false`). Until then
 * an iOS build without slug support would intercept a slug link and open on
 * its home screen; with the paths unlisted, the link opens the web page,
 * whose "Open in Nessa" button deep-links into any app version.
 */
const PLACE_PATHS = PLACE_LINKS_USE_LEGACY_ID_PATH
  ? ['/place/*']
  : ['/place/*', '/places/*']

const AASA = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appID: '3XZN4DWVFG.com.nessachat',
        paths: PLACE_PATHS,
      },
    ],
  },
}

export async function GET() {
  return NextResponse.json(AASA, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
