'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty, Notice } from '@/components/ui/feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { TabBar } from '@/components/ui/tabs'
import { Toast, useToast } from '@/components/ui/toast'
import {
  approveUser,
  rejectUser,
  reinstateUser,
  requestDocument,
  suspendUser,
} from '@/actions/admin-users'
import { timeAgo } from '@/lib/time'

export type AdminUserRow = {
  id: string
  full_name: string | null
  email: string | null
  mobile: string | null
  status: string
  role: string
  barangay_id: string | null
  approved_at: string | null
  onboarded_at: string | null
  suspended_until: string | null
  barangays: { name: string } | null
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'verified', label: 'Verified' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'deleted', label: 'Deleted' },
]

const STATUS_TONE: Record<string, string> = {
  pending: 'border-[#e3d3ac] bg-brasstint text-[#5c4512]',
  verified: 'border-[#c3d1bb] bg-olivetint text-[#3f5236]',
  suspended: 'border-[#e2b9b2] bg-dangertint text-[#8c2f1d]',
  deleted: 'border-line bg-paper2 text-ink45',
}

type DialogState =
  | null
  | { kind: 'reject'; user: AdminUserRow }
  | { kind: 'suspend'; user: AdminUserRow }
  | { kind: 'request'; user: AdminUserRow }

/** docs/02 D25 · user moderation screen. */
export function UsersScreen({
  rows,
  total,
  page,
  status,
  q,
  error,
}: {
  rows: AdminUserRow[]
  total: number
  page: number
  status: string
  q: string
  error: string | null
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [reason, setReason] = useState('')
  const [days, setDays] = useState('30')
  const [note, setNote] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending] = useTransition()

  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string, id: string) => {
    setBusyId(id)
    const res = await fn()
    if (!res.ok) show(res.error ?? 'That did not go through.', 'danger')
    else {
      show(okMsg)
      setDialog(null)
      setReason('')
      setNote('')
      router.refresh()
    }
    setBusyId(null)
  }

  const viewProof = async (id: string) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/users/${id}/proof`)
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !json.url) show(json.error ?? 'No document on file.', 'danger')
      else window.open(json.url, '_blank', 'noopener')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <TabBar
        active={status}
        onSelect={(id) => router.push(id === 'all' ? '/admin/users' : `/admin/users?status=${id}`)}
        tabs={TABS}
        className="mb-4"
      />

      <form
        className="flex gap-2.5 mb-5"
        action="/admin/users"
        onSubmit={(e) => {
          e.preventDefault()
          const value = new FormData(e.currentTarget).get('q')
          router.push(`/admin/users${status !== 'all' ? `?status=${status}` : ''}${value ? `${status !== 'all' ? '&' : '?'}q=${encodeURIComponent(String(value))}` : ''}`)
        }}
      >
        <Input
          name="q"
          defaultValue={q}
          type="search"
          aria-label="Search members"
          placeholder="Search name or email"
          className="max-w-xs"
        />
        <Button size="md" variant="secondary" type="submit">
          Search
        </Button>
      </form>

      {error ? (
        <Notice tone="danger" icon="alert" className="mb-5">
          <p className="t-small">{error} Reference: CT-ADM-407</p>
        </Notice>
      ) : null}

      {rows.length === 0 ? (
        <Empty icon="users" title="Nobody here">
          {status === 'pending'
            ? 'No residents are waiting for approval — the queue is clear.'
            : 'No members match this filter.'}
        </Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((u) => (
            <li key={u.id} className="border border-line rounded-md bg-surface p-4">
              <div className="flex flex-wrap items-start gap-4">
                <span className="w-11 h-11 rounded-full bg-paper2 border border-line inline-flex items-center justify-center font-mono text-[14px] text-ink45 flex-none">
                  {(u.full_name ?? '?').slice(0, 1).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link href={`/members/${u.id}`} className="text-[15.5px] font-medium hover:text-accent">
                      {u.full_name ?? 'Unnamed member'}
                    </Link>
                    <span
                      className={`font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border ${
                        STATUS_TONE[u.status] ?? STATUS_TONE.deleted
                      }`}
                    >
                      {u.status}
                    </span>
                    {u.role !== 'resident' ? (
                      <span className="font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border border-line text-ink70">
                        {u.role}
                      </span>
                    ) : null}
                  </div>
                  <div className="t-meta mt-1">
                    {u.email}
                    {u.barangays?.name ? ` · ${u.barangays.name}` : ''}
                    {u.onboarded_at ? ` · submitted ${timeAgo(u.onboarded_at)}` : ''}
                    {u.suspended_until && new Date(u.suspended_until) > new Date()
                      ? ` · suspended until ${new Date(u.suspended_until).toLocaleDateString('en-PH')}`
                      : ''}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" disabled={pending || busyId === u.id} onClick={() => viewProof(u.id)}>
                    View proof
                  </Button>
                  {u.status === 'pending' ? (
                    <>
                      <Button
                        size="sm"
                        disabled={pending || busyId === u.id}
                        onClick={() => act(() => approveUser({ userId: u.id }), 'Resident approved — email sent', u.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={pending}
                        onClick={() => {
                          setReason('')
                          setDialog({ kind: 'reject', user: u })
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                          setNote('')
                          setDialog({ kind: 'request', user: u })
                        }}
                      >
                        Request document
                      </Button>
                    </>
                  ) : null}
                  {u.status === 'verified' ? (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={pending}
                      onClick={() => {
                        setReason('')
                        setDays('30')
                        setDialog({ kind: 'suspend', user: u })
                      }}
                    >
                      Suspend
                    </Button>
                  ) : null}
                  {u.status === 'suspended' ? (
                    <Button
                      size="sm"
                      disabled={pending || busyId === u.id}
                      onClick={() => act(() => reinstateUser({ userId: u.id }), 'Member reinstated', u.id)}
                    >
                      Reinstate
                    </Button>
                  ) : null}
                  <ButtonLink href={`/members/${u.id}`} size="sm" variant="ghost">
                    Details
                  </ButtonLink>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > 20 ? (
        <div className="flex items-center justify-center gap-3 mt-7">
          <ButtonLink
            href={`/admin/users?${new URLSearchParams({ ...(status !== 'all' ? { status } : {}), ...(q ? { q } : {}), page: String(Math.max(1, page - 1)) })}`}
            variant="secondary"
            size="sm"
            className={page <= 1 ? 'pointer-events-none opacity-40' : ''}
          >
            Previous
          </ButtonLink>
          <span className="t-meta">page {page}</span>
          <ButtonLink
            href={`/admin/users?${new URLSearchParams({ ...(status !== 'all' ? { status } : {}), ...(q ? { q } : {}), page: String(page + 1) })}`}
            variant="secondary"
            size="sm"
          >
            Next
          </ButtonLink>
        </div>
      ) : null}

      {dialog?.kind === 'reject' ? (
        <Dialog
          title="Reject this application"
          blurb="The resident is told why, by email. They can fix the problem and apply again."
          tone="danger"
          icon="x"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Go back
              </Button>
              <Button
                variant="danger"
                disabled={pending || reason.trim().length < 10}
                onClick={() =>
                  act(
                    () => rejectUser({ userId: dialog.user.id, reason: reason.trim() }),
                    'Application rejected — email sent',
                    dialog.user.id,
                  )
                }
              >
                Reject application
              </Button>
            </>
          }
        >
          <Field label="Reason" required hint={`${reason.length}/500 — at least 10 characters`}>
            <Textarea
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="The proof photo is unreadable — please re-upload a clearer photo of your barangay certificate."
            />
          </Field>
        </Dialog>
      ) : null}

      {dialog?.kind === 'suspend' ? (
        <Dialog
          title="Suspend this member"
          blurb="They keep their account but cannot post, offer or message until the suspension ends."
          tone="danger"
          icon="lock"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={pending || reason.trim().length < 10}
                onClick={() =>
                  act(
                    () =>
                      suspendUser({
                        userId: dialog.user.id,
                        reason: reason.trim(),
                        days: Number(days) || 30,
                      }),
                    'Member suspended — email sent',
                    dialog.user.id,
                  )
                }
              >
                Suspend member
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Reason" required hint={`${reason.length}/500 — at least 10 characters`}>
              <Textarea
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <Field label="Days" required>
              <Select value={days} onChange={(e) => setDays(e.target.value)}>
                {['7', '14', '30', '90', '365'].map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Dialog>
      ) : null}

      {dialog?.kind === 'request' ? (
        <Dialog
          title="Request another document"
          blurb="We ask the resident for a clearer or additional proof of residency. Their status stays pending."
          tone="accent"
          icon="mail"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  act(
                    () => requestDocument({ userId: dialog.user.id, note: note.trim() || undefined }),
                    'Request sent — email delivered',
                    dialog.user.id,
                  )
                }
              >
                Send request
              </Button>
            </>
          }
        >
          <Field label="Note (optional)">
            <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
