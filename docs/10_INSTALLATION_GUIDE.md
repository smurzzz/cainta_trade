# 10 · Installation Guide (local development)

Stack: Next.js · Clerk · Supabase · Tailwind CSS.

## 1. Requirements
| Tool | Notes |
|---|---|
| Node.js | Current LTS version |
| npm (or pnpm) | Comes with Node |
| Git | |
| Supabase CLI | `npm i -D supabase` (used via `npx supabase`) |
| Accounts | Clerk, Supabase, Resend, Vercel (hosting later) |
| Tunnel tool | ngrok or Cloudflare Tunnel (to test the Clerk webhook locally) |

## 2. Create the app
```bash
npx create-next-app@latest caintatrade --typescript --tailwind --eslint --app
cd caintatrade
npm i @clerk/nextjs @supabase/supabase-js zod react-hook-form @hookform/resolvers resend @react-email/components recharts @dnd-kit/core @dnd-kit/sortable lucide-react browser-image-compression
npm i -D supabase vitest @playwright/test
```
Create the folders listed in `01_PROJECT_OVERVIEW.md` (app groups, `lib/`, `components/`, `supabase/`).

## 3. Create the Clerk application
1. Clerk dashboard → Create application → enable **Email** + **Password** sign-in.
2. Require email verification at sign-up.
3. Copy the **Publishable key** and **Secret key**.
4. Set the sign-in/sign-up paths (`/sign-in`, `/sign-up`) and after-sign-up redirect to `/onboarding`.
5. Optional: enable MFA/phone only after checking your plan and SMS cost.

## 4. Create the Supabase project
1. Supabase dashboard → New project (choose the region nearest your users) and save the database password.
2. Copy the Project URL, the public (anon/publishable) key and the service-role (secret) key.
3. Link the CLI and push migrations:
```bash
npx supabase login
npx supabase init
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # applies supabase/migrations/*.sql
```
4. Run `supabase/seed.sql` from the SQL editor (barangays, categories, meetup spots).
5. Confirm the buckets exist: `listing-photos` (public), `residency-docs`, `chat-photos`, `report-evidence` (private).
6. Confirm RLS is **enabled** on every table (Table editor shows a lock/RLS badge).

## 5. Connect Clerk to Supabase (native integration)
1. Clerk dashboard → Supabase integration setup → **Activate Supabase integration**; copy the Clerk domain it shows.
2. Supabase dashboard → Authentication → Sign In/Up → **Third Party Auth** → add **Clerk** with that domain.
3. In code, create the server client with the Clerk token:
```ts
// lib/supabase/server.ts
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export function supabaseUser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { async accessToken() { return (await auth()).getToken() } }
  )
}
```
```ts
// lib/supabase/admin.ts  (server only, never import in client components)
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
```
Because `accessToken` is set, do not call `supabase.auth.*`.

## 6. Environment variables
Create `.env.local` (never commit it) and keep a sanitized `.env.example` in Git.
```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
RESEND_API_KEY=
EMAIL_FROM="CaintaTrade <hello@yourdomain>"

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=<long random string>
```
Only variables starting with `NEXT_PUBLIC_` reach the browser. Everything else stays on the server.

## 7. Wire up Clerk in the app
- Wrap the root layout with `<ClerkProvider>`.
- Add `middleware.ts` using `clerkMiddleware` to protect member and admin routes and keep sign-in, sign-up, public pages and `/api/webhooks/*` public. (In newer Next.js versions this file may be named `proxy.ts`; follow the docs for your installed version.)
- Create `app/(auth)/sign-in/[[...sign-in]]/page.tsx` and `.../sign-up/...` with `<SignIn />` and `<SignUp />`.

## 8. Clerk webhook (profile sync)
1. Run the app: `npm run dev`.
2. Start a tunnel: `ngrok http 3000` (or Cloudflare Tunnel) and copy the https URL.
3. Clerk dashboard → Webhooks → Add endpoint: `https://<tunnel>/api/webhooks/clerk`, events `user.created`, `user.updated`, `user.deleted`.
4. Copy the **Signing secret** into `CLERK_WEBHOOK_SIGNING_SECRET`.
5. Sign up a test user and confirm a row appears in `profiles`.
For production, set the endpoint to your real domain.

## 9. Create the first administrator
1. Sign up normally through the app.
2. In Supabase SQL editor (replace the id with the Clerk user id from the Clerk dashboard):
```sql
update profiles
set role = 'admin', status = 'verified', onboarded_at = now()
where id = 'user_xxxxxxxxxxxx';
```
3. Sign in and open `/admin`. Create moderators later from the admin screens or the same SQL.

## 10. Resend (email)
1. Resend dashboard → create API key; add and verify your sending domain (SPF, DKIM) before launch.
2. For local testing use Resend's test sender.

## 11. Cron jobs
`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/expire-listings", "schedule": "0 * * * *" },
    { "path": "/api/cron/expire-offers", "schedule": "30 * * * *" },
    { "path": "/api/cron/purge-residency", "schedule": "0 2 * * *" },
    { "path": "/api/cron/meetup-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/purge-old", "schedule": "0 3 1 * *" }
  ]
}
```
- Every cron route must check `Authorization: Bearer ${CRON_SECRET}` (Vercel sends it when `CRON_SECRET` is set).
- Check your Vercel plan: cron frequency is limited on free plans. If hourly runs are not allowed, run daily or use Supabase `pg_cron` for the SQL-only jobs.
- Test locally: `curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/expire-listings?dryRun=1"`.

## 12. Run, build, test
```bash
npm run dev            # http://localhost:3000
npm run lint
npm run build && npm start
npx vitest             # unit tests
npx playwright install && npx playwright test
```

## 13. Deploy checklist (Vercel + Supabase)
- [ ] Push to GitHub, import the repo in Vercel
- [ ] Add all environment variables in Vercel (Production and Preview)
- [ ] Use Clerk **production** instance keys and production domain
- [ ] Re-add Clerk as Supabase third-party auth for production if you use a separate Supabase project
- [ ] Update the Clerk webhook URL to the production domain
- [ ] Add custom domain and confirm HTTPS
- [ ] Verify Resend domain; send a test email
- [ ] Confirm cron jobs appear in Vercel
- [ ] Run a smoke test: sign up, onboard, approve, post, offer, chat

## 14. Troubleshooting
| Problem | Likely cause / fix |
|---|---|
| Supabase returns empty data for signed-in users | Clerk not added as third-party auth, or integration not activated in Clerk |
| `supabase.auth.*` throws | Expected when `accessToken` is used; remove those calls |
| Profile row not created | Webhook URL, signing secret or tunnel wrong; check Clerk webhook logs |
| Redirect loop after sign-up | Middleware protecting `/onboarding` before profile exists; allow signed-in users there |
| Upload to private bucket fails from browser | Residency uploads must go through a server action using the service role |
| Cron returns 401 | Missing `CRON_SECRET` header or env var |
| 403 on admin pages | `profiles.role` not set to moderator/admin |
| Realtime messages not arriving | Table not in the Realtime publication, or RLS blocks select for the subscriber |
