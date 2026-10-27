'use client'

import Link from 'next/link'

import { useAdminHref } from '@/components/admin/admin-shell'
import { Icon, type IconName } from '@/components/dash/icons'
import { cx, formatDateTime, timeAgo } from '@/components/dash/ui'
import {
  AUDIT_SCOPE_LABELS,
  auditActor,
  auditTargetPlaceId,
  describeAuditChange,
  type AuditScope,
  type ConsoleAuditItem,
} from '@/lib/admin-console'

const SCOPE_ICON: Record<AuditScope, IconName> = {
  admins: 'shield',
  chat: 'chat',
  links: 'qr',
  business: 'briefcase',
}

/** Audit entries as a readable timeline ("who did what, when"). */
export function AuditList({
  items,
  compact,
  showScope = true,
  linkPlaces = true,
}: {
  items: ConsoleAuditItem[]
  compact?: boolean
  showScope?: boolean
  linkPlaces?: boolean
}) {
  const adminHref = useAdminHref()
  return (
    <ol className="divide-y divide-n-line-soft">
      {items.map(item => {
        const scope = (item.scope in SCOPE_ICON ? item.scope : 'admins') as AuditScope
        const placeId = linkPlaces ? auditTargetPlaceId(item) : null
        return (
          <li key={item.id} className={cx('flex gap-3', compact ? 'px-5 py-3 max-sm:px-4' : 'px-5 py-3.5 max-sm:px-4')}>
            <span
              aria-hidden
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-n-sunken text-n-muted"
            >
              <Icon name={SCOPE_ICON[scope]} size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5 text-n-ink-2">
                <span className="font-medium text-n-ink">{auditActor(item)}</span> {describeAuditChange(item)}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-n-subtle">
                <time dateTime={item.at ?? undefined} title={formatDateTime(item.at)}>
                  {timeAgo(item.at)}
                </time>
                {showScope ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{AUDIT_SCOPE_LABELS[scope]}</span>
                  </>
                ) : null}
                {placeId ? (
                  <>
                    <span aria-hidden>·</span>
                    <Link href={adminHref(`places/${encodeURIComponent(placeId)}`)} className="text-n-accent-strong hover:underline">
                      Open place
                    </Link>
                  </>
                ) : null}
              </p>
              {item.note && !compact ? (
                <p className="mt-1 rounded-md bg-n-surface-2 px-2 py-1 text-xs text-n-muted">“{item.note}”</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
