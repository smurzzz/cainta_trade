import type { Metadata } from 'next'
import { Icon } from '@/components/ui/icon'
import { SignInForm } from '@/components/auth/sign-in-form'

export const metadata: Metadata = {
  title: 'Log in — CaintaTrade',
}

const WEEK = [
  ['New items listed', '38'],
  ['Offers sent', '64'],
  ['Trades completed', '27'],
  ['Busiest barangay', 'San Andres'],
]

export default function SignInPage() {
  return (
    <div className="wrap py-7 md:py-11">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="max-w-[560px]">
          <div className="eyebrow">
            <span className="t-label-accent">Welcome back</span>
          </div>
          <h1 className="t-h1">Log in to CaintaTrade</h1>
          <p className="t-small mt-3">Sign in to post items, send offers and continue a trade.</p>

          <SignInForm />
        </div>

        {/* side column */}
        <div className="flex flex-col gap-4">
          <div className="border border-line rounded-md bg-ink text-paper p-6">
            <div className="text-[rgba(247,244,239,.6)] font-mono text-[11.5px] tracking-[0.12em] uppercase mb-3">
              This week in Cainta
            </div>
            <div className="flex flex-col gap-3">
              {WEEK.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-[rgba(247,244,239,.8)]">{label}</span>
                  <b className="text-paper font-semibold">{value}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-line rounded-md bg-paper2 p-6">
            <div className="t-label mb-2">Signing in on a shared phone?</div>
            <p className="t-small">
              Leave “keep me signed in” unticked, and always sign out from the profile menu when
              you are done — especially at a computer shop.
            </p>
          </div>
          <div className="flex gap-3 items-start border border-line border-l-[3px] border-l-ink bg-surface rounded-sm px-4 py-3.5">
            <Icon name="shield" size={18} className="mt-0.5 flex-none" />
            <span className="t-small">
              CaintaTrade staff will never ask for your password or a verification code. Report any
              message that does.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
