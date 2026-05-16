import fs from 'node:fs'
import path from 'node:path'

import admin from 'firebase-admin'

function loadServiceAccount(): admin.ServiceAccount | null {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim()
  if (filePath) {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.join(/* turbopackIgnore: true */ process.cwd(), filePath)
    try {
      const raw = fs.readFileSync(resolved, 'utf8')
      return JSON.parse(raw) as admin.ServiceAccount
    } catch (e) {
      console.error('[firebase-admin] failed to read FIREBASE_SERVICE_ACCOUNT_PATH', resolved, e)
      return null
    }
  }

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (inline) {
    try {
      return JSON.parse(inline) as admin.ServiceAccount
    } catch (e) {
      console.error('[firebase-admin] invalid FIREBASE_SERVICE_ACCOUNT_JSON', e)
      return null
    }
  }

  return null
}

/**
 * Server-only Firestore (Firebase Admin). Bypasses client security rules.
 *
 * Local: set `FIREBASE_SERVICE_ACCOUNT_PATH` to a JSON file (e.g. `./secrets/firebase-adminsdk.json`).
 * Vercel / CI: set `FIREBASE_SERVICE_ACCOUNT_JSON` to the full JSON string.
 */
export function getAdminFirestore(): admin.firestore.Firestore | null {
  if (admin.apps.length > 0) {
    return admin.firestore()
  }
  const cred = loadServiceAccount()
  if (!cred) {
    return null
  }
  try {
    admin.initializeApp({
      credential: admin.credential.cert(cred),
    })
    return admin.firestore()
  } catch (e) {
    console.error('[firebase-admin] init failed', e)
    return null
  }
}
