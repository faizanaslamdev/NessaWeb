'use client'

import { useCallback, useEffect, useState } from 'react'

import { useAdmin } from '@/components/admin/admin-shell'
import { AuditList } from '@/components/admin/audit-list'
import { ShellTitle } from '@/components/dash/app-shell'
import { Button, EmptyState, LoadingBlock, Notice, PageHeader, Panel, Segmented } from '@/components/dash/ui'
import { AUDIT_SCOPE_LABELS, listConsoleAudit, type AuditScope, type ConsoleAuditItem } from '@/lib/admin-console'

type Filter = 'all' | AuditScope

const PAGE = 40

export function AdminAudit() {
  const { role } = useAdmin()
  const [scope, setScope] = useState<Filter>('all')
  const [items, setItems] = useState<ConsoleAuditItem[] | null>(null)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (s: Filter, before: string | null) => {
    setBusy(true)
    setError(null)
    try {
      const res = await listConsoleAudit({ scope: s, limit: PAGE, before })
      setItems(current => (before && current ? [...current, ...res.items] : res.items))
      setMore(res.more)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the audit log.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(null)
    void load(scope, null)
  }, [scope, load])

  const scopes: Filter[] = ['all', 'business', 'places', 'chat', 'links', ...(role === 'super_admin' ? (['admins'] as const) : [])]

  return (
    <>
      <ShellTitle crumbs={[{ label: 'Audit log' }]} />
      <PageHeader
        title="Audit log"
        description="Who changed what, and when — business claims and teams, live chat settings, QR placements and the admin team."
      />
      <div className="mb-4 overflow-x-auto">
        <Segmented
          label="Filter by area"
          value={scope}
          onChange={setScope}
          options={scopes.map(s => ({ value: s, label: s === 'all' ? 'Everything' : AUDIT_SCOPE_LABELS[s] }))}
        />
      </div>
      <Panel>
        {error ? (
          <div className="p-5">
            <Notice tone="danger">{error}</Notice>
          </div>
        ) : null}
        {!items ? (
          <LoadingBlock rows={8} label="Loading audit log…" />
        ) : items.length === 0 ? (
          <EmptyState icon="log" title="No changes recorded here yet" />
        ) : (
          <>
            <AuditList items={items} showScope={scope === 'all'} />
            {more ? (
              <div className="flex justify-center border-t border-n-line-soft p-3">
                <Button size="sm" loading={busy} onClick={() => void load(scope, items[items.length - 1]?.at ?? null)}>
                  Show older
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Panel>
    </>
  )
}
