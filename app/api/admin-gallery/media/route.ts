import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore'

import { ADMIN_GALLERY_COOKIE, verifyAdminGallerySession } from '@/lib/admin-gallery-session'
import { getAdminFirestore } from '@/lib/firebase-admin'

export type AdminGalleryMediaRow = {
  id: string
  src: string
  thumbnail: string
  type: 'image' | 'video'
  createdAt: string | null
}

type MediaRowWithTs = AdminGalleryMediaRow & { _ts: number }

const CHAT_BATCH_SIZE = 100
const MESSAGES_BATCH_SIZE = 100
const CHAT_QUERY_CONCURRENCY = 16

function compareMediaNewestFirst(a: MediaRowWithTs, b: MediaRowWithTs): number {
  if (b._ts !== a._ts) {
    return b._ts - a._ts
  }
  return b.id.localeCompare(a.id)
}

function messageToRow(doc: QueryDocumentSnapshot): MediaRowWithTs | null {
  const data = doc.data()
  const url = typeof data.url === 'string' ? data.url.trim() : ''
  if (!url) {
    return null
  }
  if (data.type !== 'image' && data.type !== 'video') {
    return null
  }
  const chatId = doc.ref.parent.parent?.id
  if (!chatId) {
    return null
  }
  const createdAt = data.createdAt
  const ts =
    createdAt && typeof createdAt.toMillis === 'function'
      ? createdAt.toMillis()
      : typeof createdAt?._seconds === 'number'
        ? createdAt._seconds * 1000
        : 0
  return {
    id: `${chatId}__${doc.id}`,
    src: url,
    thumbnail: url,
    type: data.type,
    createdAt: ts > 0 ? new Date(ts).toISOString() : null,
    _ts: ts,
  }
}

async function fetchAllChatIds(db: Firestore): Promise<string[]> {
  const ids: string[] = []
  let lastChat: QueryDocumentSnapshot | undefined

  while (true) {
    let query = db.collection('chats').orderBy('updatedAt', 'desc').limit(CHAT_BATCH_SIZE)
    if (lastChat) {
      query = query.startAfter(lastChat)
    }
    const snap = await query.get()
    if (snap.empty) {
      break
    }
    for (const doc of snap.docs) {
      ids.push(doc.id)
    }
    lastChat = snap.docs[snap.docs.length - 1]
    if (snap.size < CHAT_BATCH_SIZE) {
      break
    }
  }

  return ids
}

async function fetchAllMediaForChat(db: Firestore, chatId: string): Promise<MediaRowWithTs[]> {
  const rows: MediaRowWithTs[] = []
  let lastMessage: QueryDocumentSnapshot | undefined

  while (true) {
    let query = db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .where('type', 'in', ['image', 'video'])
      .limit(MESSAGES_BATCH_SIZE)
    if (lastMessage) {
      query = query.startAfter(lastMessage)
    }
    const snap = await query.get()
    if (snap.empty) {
      break
    }
    for (const doc of snap.docs) {
      const row = messageToRow(doc)
      if (row) {
        rows.push(row)
      }
    }
    lastMessage = snap.docs[snap.docs.length - 1]
    if (snap.size < MESSAGES_BATCH_SIZE) {
      break
    }
  }

  return rows
}

/**
 * Lists all image/video messages from chats → messages, newest first (no pagination).
 */
export async function GET(request: Request) {
  const secret = process.env.ADMIN_GALLERY_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'ADMIN_GALLERY_SECRET not set' }, { status: 503 })
  }

  const jar = await cookies()
  if (!verifyAdminGallerySession(jar.get(ADMIN_GALLERY_COOKIE)?.value, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getAdminFirestore()
  if (!db) {
    return NextResponse.json(
      {
        error:
          'No service account: set FIREBASE_SERVICE_ACCOUNT_PATH (e.g. ./secrets/adminsdk.json) or FIREBASE_SERVICE_ACCOUNT_JSON on the server.',
        items: [] as AdminGalleryMediaRow[],
      },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type')

  try {
    const chatIds = await fetchAllChatIds(db)
    const rows: MediaRowWithTs[] = []

    for (let i = 0; i < chatIds.length; i += CHAT_QUERY_CONCURRENCY) {
      const batch = chatIds.slice(i, i + CHAT_QUERY_CONCURRENCY)
      const batchRows = await Promise.all(batch.map((chatId) => fetchAllMediaForChat(db, chatId)))
      for (const chatRows of batchRows) {
        rows.push(...chatRows)
      }
    }

    rows.sort(compareMediaNewestFirst)

    let items = rows.map((row) => ({
      id: row.id,
      src: row.src,
      thumbnail: row.thumbnail,
      type: row.type,
      createdAt: row.createdAt,
    }))

    if (typeFilter === 'image' || typeFilter === 'video') {
      items = items.filter((row) => row.type === typeFilter)
    }

    return NextResponse.json({ items, total: items.length })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[admin-gallery/media]', e)
    return NextResponse.json(
      {
        error: msg,
        items: [] as AdminGalleryMediaRow[],
        total: 0,
      },
      { status: 500 },
    )
  }
}
