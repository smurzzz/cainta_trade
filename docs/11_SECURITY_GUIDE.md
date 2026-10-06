# 11 · Security Guide

Stack: Next.js · Clerk · Supabase · Tailwind. Goal: protect residents' personal data and government ID proofs, stop scams and abuse, and keep admin actions accountable.

## 1. What we protect
| Asset | Risk | Main control |
|---|---|---|
| Residency proofs (government ID) | Leak, misuse | Private bucket, server-only access, 60 s signed URL, audit row, 90-day deletion |
| Personal data (name, address, mobile) | Exposure | RLS, public view with only safe columns, privacy toggles |
| Accounts | Takeover, fake accounts | Clerk (verified email, strong passwords, sessions), admin approval |
| Messages | Snooping | RLS: only offer parties |
| Admin power | Abuse | Roles, append-only audit log, server-side checks |
| Trades | Fraud, cash requests | Reports, keyword flags, safety banners |

## 2. Authentication and authorization
- Clerk handles passwords, email verification, sessions, reset. Do not build custom auth.
- `middleware.ts` protects routes, but **never rely on middleware alone**: every Server Action and Route Handler calls `requireSignedIn`, `requireVerified` or `requireRole`.
- Roles live in `profiles.role`; change only with `supabaseAdmin()` after an admin check.
- **IDOR check** in every action that takes an id: confirm the row belongs to the user or the user is a party to it.
```ts
// lib/auth/guards.ts (sketch)
export async function requireVerified() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const { data: p } = await supabaseAdmin().from('profiles').select('status,role').eq('id', userId).single()
  if (p?.status !== 'verified') redirect('/account-status')
  return { userId, role: p.role }
}
```

## 3. Row Level Security (Supabase)
- Enable RLS on **every** table; default deny.
- Use the Clerk id: `(select auth.jwt()->>'sub')`.
```sql
alter table offers enable row level security;
create policy "offer parties read" on offers for select
  using ((select auth.jwt()->>'sub') in (from_user_id, to_user_id));
```
- Writes to offers/trades go through SQL functions; revoke direct insert/update from clients.
- No client policies at all on `residency_documents`, `admin_actions`, `prohibited_keywords`.
- Expose profiles to others only via a `public_profiles` view with safe columns.
- Append-only audit:
```sql
create or replace function block_audit_change() returns trigger as $$
begin raise exception 'admin_actions is append-only'; end $$ language plpgsql;
create trigger admin_actions_no_update before update or delete on admin_actions
  for each row execute function block_audit_change();
```
- Test every table as: anon, pending user, verified user, another user, moderator, admin.

## 4. Secrets and environment
- Service-role key, Clerk secret, webhook secret, Resend key, `CRON_SECRET`: server only; never prefixed `NEXT_PUBLIC_`.
- `import 'server-only'` in `supabaseAdmin` file.
- Commit `.env.example` only; add `.env*` to `.gitignore`; rotate any leaked key immediately.
- Separate Clerk and Supabase projects/keys for development and production.

## 5. Residency documents
1. Upload via Server Action (service role) to `residency-docs/{clerkId}/{random}.ext`; bucket has no client policies.
2. Accept JPG, PNG, PDF ≤5 MB; check real file type, not just extension.
3. Admin view: Route Handler checks role, creates a 60-second signed URL, writes `document_viewed` to the audit log.
4. Never log or email the file, never show it to other members.
5. Daily job deletes file and row 90 days after approval; rejected documents are deleted after review.
6. Do not display or store ID numbers in the database; the file is the only record.

## 6. File uploads (all buckets)
- Allowed types and size limits per bucket; random file names; per-user folders; no user-controlled paths.
- Compress listing photos on the client; strip EXIF location data.
- Chat and report files in private buckets with signed URLs.

## 7. Input, output and request safety
- Validate every Server Action and Route Handler input with zod; reject unknown fields.
- Use Supabase client or RPC only (parameterised); never build SQL by string concatenation.
- React escapes output by default; never use `dangerouslySetInnerHTML` for user text (descriptions, messages, reports).
- Server Actions include origin checks; keep mutations out of GET handlers.
- Webhooks: verify the Svix signature; reject otherwise. Cron routes: verify `CRON_SECRET`.
- Open redirects: only redirect to known internal paths.

## 8. Security headers (`next.config`)
```ts
const headers = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]
// async headers() { return [{ source: '/(.*)', headers }] }
```
Add a Content-Security-Policy in **report-only mode first**, then allow Clerk, Supabase, Resend-hosted images and your own domain, and enforce after testing.

## 9. Abuse and scam prevention
- Rate limit (e.g. Upstash Ratelimit or similar) on onboarding, offers, messages, reports, uploads.
- Keyword rules: hold list queues listings for review; "cash", "gcash", "down payment" only flag.
- Chat banner: never send money, gift codes or ID numbers; one-click report.
- One active offer per item; blocks; suspension with reason and appeal.
- Admin queue shows overdue approvals (>24 h) and urgent money reports.

## 10. Audit and monitoring
- Log: proof views, approvals, rejections, suspensions, removals, warnings, setting changes, cron runs.
- Error pages show a reference code that matches a server log entry; do not show stack traces.
- Add error tracking (for example Sentry) and uptime check; review Supabase and Clerk logs.
- Retention: audit 24 months, document views 12 months, messages 24 months.

## 11. Privacy (RA 10173) controls
- [ ] Consent captured at onboarding (Terms, Privacy) with version and timestamp
- [ ] Privacy notice names what is collected, why, retention, who sees it
- [ ] User can export data, correct data, delete residency doc, delete account
- [ ] Address never public; show only barangay
- [ ] Data Protection Officer details are real before launch
- [ ] Breach plan written; confirm the current National Privacy Commission notification rules and registration requirements
- [ ] Legal review of Terms and Privacy

## 12. Dependencies and platform
- `npm audit` in CI; update Next.js, Clerk and Supabase packages regularly.
- Enable Dependabot or similar; lock versions with the lockfile.
- Enable Supabase backups (confirm what your plan includes) and test a restore.
- Use MFA on your Clerk, Supabase, Vercel, GitHub and domain accounts.

## 13. Incident response (short)
1. **Contain:** rotate keys, suspend affected accounts, disable the feature if needed.
2. **Assess:** what data, how many people, from when (use audit and platform logs).
3. **Notify:** affected users and the regulator as required by law.
4. **Fix and review:** patch, add a test, write a short post-mortem.

## 14. Pre-launch security checklist
- [ ] RLS enabled on all tables and tested per role
- [ ] No service-role or secret keys in client bundle (search the build output)
- [ ] All actions have guards and ownership checks
- [ ] Webhook and cron secrets verified
- [ ] Upload limits and type checks tested
- [ ] Residency bucket confirmed private; signed URL expires in 60 s
- [ ] Audit log blocks update/delete
- [ ] Rate limits active
- [ ] Security headers present; CSP reviewed
- [ ] `npm audit` clean or reviewed
- [ ] Backup restore tested
- [ ] Privacy checklist complete
