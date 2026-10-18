import {NextResponse} from 'next/server'

/**
 * Apple App Site Association for Universal Links.
 * Content-Type must be application/json (Apple accepts this for AASA).
 *
 * appID = Apple Team ID + "." + bundle ID (from Xcode DEVELOPMENT_TEAM).
 */
const AASA = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appID: '3XZN4DWVFG.com.nessachat',
        // Canonical slug URLs (`/places/{slug}`) are intentionally NOT listed
        // yet: app builds before slug support can't route them and would open
        // to the home screen. Add '/places/*' once the slug-aware app release
        // is widely installed (until then those links open the web page,
        // whose "Open in Nessa" button deep-links into any app version).
        paths: ['/place/*'],
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
