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
