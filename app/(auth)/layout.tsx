import { AuthShell } from '@/components/layout/auth-shell'

/** Auth group: sign-in, sign-up, onboarding, account-status. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>
}
