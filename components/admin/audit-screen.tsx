'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Empty, Notice } from '@/components/ui/feedback'
import { Field, Input, Select } from '@/components/ui/field'
import { Toast, useToast } from '@/components/ui/toast'
import { exportAuditCsv } from '@/actions/admin-console'
import { timeAgo } from '@/lib/time'

export type AuditRow = {
  id: string
  admin_id: string | null
  action: string
  subject_type: string
  subject_id: string
  rule_ref: string | null
  reason: string | null
  created_at: string
}

export type AuditFilters = {
  action?: string
  adminId?: string
  subjectType?: string
  from?: string
  to?: string
  page: number
}

const SUBJECTS = ['profile', 'item', 'report', 'category', 'keyword', 'barangay', 'meetup_spot', 'announcement', 'trade', 'offer']

/** docs/02 D30 · audit log screen: filters, table, CSV export. */
export function AuditScreen({
  rows,
  total,
  page,
  filters,
  error,
}: {
  rows: AuditRow[]
  total: number
  page: number
  filters: AuditFilters
  error: string | null
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    action: filters.action ?? '',
    adminId: filters.adminId ?? '',
    subjectType: filters.subjectType ?? '',
    from: filters.from ?? '',
    to: filters.to ?? '',
  })

  const apply = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(form)) if (v) params.set(k, v)
    router.push(`/admin/audit${params.size ? `?${params}` : ''}`)
  }

  const clear = () => {
    setForm({ action: '', adminId: '', subjectType: '', from: '', to: '' })
    router.push('/admin/audit')
  }

  const exportCsv = () => {
    startTransition(async () => {
      const res = await exportAuditCsv(form)
      if (!res.ok) show(res.error, 'danger')
      else {
        const blob = new Blob([res.data!.csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `caintatrade-audit-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        show('Export downloaded')
      }
    })
  }

  return (
    <>
      <form onSubmit={apply} className="border border-line rounded-md bg-surface p-5 mb-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Action">
            <Input
              value={form.action}
              maxLength={60}
              onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
              placeholder="user_approved"
            />
          </Field>
          <Field label="Admin ID">
            <Input
              value={form.adminId}
              maxLength={64}
              onChange={(e) => setForm((f) => ({ ...f, adminId: e.target.value }))}
              placeholder="user_…"
            />
          </Field>
          <Field label="Subject type">
            <Select
              value={form.subjectType}
              onChange={(e) => setForm((f) => ({ ...f, subjectType: e.target.value }))}
            >
              <option value="">Any</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From">
            <Input
              type="date"
              value={form.from}
              onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={form.to}
              onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2.5 mt-4">
          <Button size="sm" type="submit">
            Apply filters
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={clear}>
            Clear
          </Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={exportCsv}>
            {pending ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </form>

      {error ? (
        <Notice tone="danger" icon="alert" className="mb-5">
          <p className="t-small">{error} Reference: CT-ADM-407</p>
        </Notice>
      ) : null}

      {rows.length === 0 ? (
        <Empty icon="folder" title="No entries">
          Nothing matches these filters.
        </Empty>
      ) : (
        <div className="border border-line rounded-md bg-surface overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase text-ink45 border-b border-line">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper2">
                  <td className="px-4 py-2.5 whitespace-nowrap t-meta">
                    {new Date(r.created_at).toLocaleString('en-PH', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                    <span className="ml-2 text-ink45">{timeAgo(r.created_at)}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px]">{r.action}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-ink70">{r.subject_type.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-[11px] text-ink45 ml-2">
                      {r.subject_id.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11.5px] text-ink70">
                    {r.admin_id ? `${r.admin_id.slice(0, 12)}…` : 'system'}
                  </td>
                  <td className="px-4 py-2.5 text-ink70 max-w-[260px] truncate">
                    {r.reason ?? r.rule_ref ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 ? (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => router.push(`/admin/audit?page=${page - 1}`)}
          >
            Newer
          </Button>
          <span className="t-meta">page {page}</span>
          <Button
            size="sm"
            variant="secondary"
            disabled={rows.length < 50}
            onClick={() => router.push(`/admin/audit?page=${page + 1}`)}
          >
            Older
          </Button>
        </div>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
