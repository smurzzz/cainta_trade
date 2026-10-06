import type { Metadata } from 'next'
import { RecoveryFlow } from '@/components/auth/recovery-flow'

export const metadata: Metadata = {
  title: 'Recover your account — CaintaTrade',
}

/** B8 password + email recovery (mockup b8-recovery), headless Clerk. */
export default function RecoveryPage() {
  return <RecoveryFlow />
}
