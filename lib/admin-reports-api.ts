'use client'

/**
 * `adminBusinessMessaging` callable (Nessa admins only): list / read /
 * resolve business-messaging reports. Errors are rethrown as Error with a
 * plain-language message (describeReportsError) and the code attached.
 */

import { getFunctions, httpsCallable } from 'firebase/functions'

import { AdminActionError } from '@/lib/admin'
import {
  REPORT_THREAD_MESSAGES,
  buildListReportsRequest,
  buildResolveRequest,
  describeReportsError,
  parseAdminThread,
  parseReport,
  parseReportsPage,
  type AdminReport,
  type AdminThreadView,
  type ReportStatusFilter,
  type ResolveDraft,
} from '@/lib/admin-reports'
import { getFirebaseClient } from '@/lib/firebase'

async function call(data: Record<string, unknown>, fallback: string): Promise<unknown> {
  try {
    const { app } = getFirebaseClient()
    const callable = httpsCallable<Record<string, unknown>, unknown>(getFunctions(app), 'adminBusinessMessaging')
    return (await callable(data)).data
  } catch (e) {
    const info = describeReportsError(e, fallback)
    throw new AdminActionError(info.code, info.message)
  }
}

export async function listReports(input: {
  status: ReportStatusFilter
  cursor?: string | null
  limit?: number
}): Promise<{ reports: AdminReport[]; nextCursor: string | null }> {
  return parseReportsPage(await call(buildListReportsRequest(input), 'Couldn’t load reports.'))
}

export async function getReportThread(threadId: string, limit = REPORT_THREAD_MESSAGES): Promise<AdminThreadView> {
  return parseAdminThread(await call({ action: 'getThread', threadId, limit }, 'Couldn’t load the conversation.'), threadId)
}

export async function resolveReport(reportId: string, draft: ResolveDraft): Promise<AdminReport | null> {
  const res = (await call(buildResolveRequest(reportId, draft), 'Couldn’t resolve the report.')) as { report?: unknown } | null
  return parseReport(res?.report)
}
