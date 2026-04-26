'use client'

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getDatabase, type Database } from 'firebase/database'

export type FirebaseClient = {
  app: FirebaseApp
  auth: Auth
  firestore: Firestore
  rtdb: Database
}

let client: FirebaseClient | null = null

/**
 * Read env with **static** `process.env.NEXT_PUBLIC_*` keys only.
 * Next.js inlines those at build time; `process.env[name]` stays undefined in the browser bundle.
 */
function readWebFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  if (!apiKey || !authDomain || !databaseURL || !projectId || !appId) {
    throw new Error(
      'Missing Firebase env — set NEXT_PUBLIC_FIREBASE_* in nessa-web/.env.local and restart `npm run dev` (see .env.example).',
    )
  }
  return {
    apiKey,
    authDomain,
    databaseURL,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId,
  }
}

/**
 * Single Firebase web client for instant chat (Auth + Firestore + RTDB).
 * Call only from client components / hooks after mount.
 */
export function getFirebaseClient(): FirebaseClient {
  if (client) return client

  const appConfig = readWebFirebaseConfig()

  const app = getApps().length ? getApps()[0]! : initializeApp(appConfig)
  client = {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    rtdb: getDatabase(app),
  }
  return client
}
