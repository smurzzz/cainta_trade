import type { Metadata } from 'next'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { Icon } from '@/components/ui/icon'

export const metadata: Metadata = {
  title: 'Create your account — CaintaTrade',
}

const BENEFITS = [
  { icon: 'box', text: 'Post unlimited items you no longer need' },
  { icon: 'swap', text: 'Send and receive trade offers in your barangay' },
  { icon: 'chat', text: 'Chat attached to each offer, with a trade record' },
  { icon: 'shield', text: 'Report and block tools, plus safety reminders' },
]

const REQUIREMENTS: [string, string][] = [
  ['Age', '18+ only'],
  ['Residency', 'One of the 7 Cainta barangays'],
  ['Proof', 'Barangay ID, bill or lease'],
  ['Review', 'Within 24 hours'],
  ['Cost', 'Free, always'],
]

/** B6 register — custom mockup form (docs/08 #10: headless Clerk, not <SignUp/>). */
export default function SignUpPage() {
  return (
    <div className="wrap py-7 md:py-11">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="max-w-[680px]">
          <div className="eyebrow">
            <span className="t-label-accent">Two steps · about two minutes</span>
          </div>
          <h1 className="t-h1">Join CaintaTrade</h1>
          <p className="t-small mt-3">
            Takes about two minutes. We review every new member so the trading floor stays local
            and real — you will get an email once your account is approved.
          </p>

          <SignUpForm />
        </div>

        {/* side column */}
        <div className="flex flex-col gap-4">
          <div className="border border-[#e8cfc6] rounded-md bg-accenttint p-6">
            <div className="t-label-accent mb-3">Why we ask for proof</div>
            <p className="t-small">
              Trading with a neighbour only works if everyone is really from Cainta. One document
              is enough, it is seen only by an administrator, and it is deleted 90 days after your
              account is approved.
            </p>
          </div>
          <div className="border border-line rounded-md bg-surface p-6">
            <div className="t-label mb-3">What you get</div>
            <div className="flex flex-col gap-3">
              {BENEFITS.map((b) => (
                <div key={b.text} className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-olivetint text-olive flex items-center justify-center flex-none">
                    <Icon name={b.icon} size={17} />
                  </span>
                  <span className="t-small flex-1">{b.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-line rounded-md bg-paper2 p-6">
            <div className="t-label mb-3">Registration requirements</div>
            <div className="grid grid-cols-1 gap-y-1 text-[14.5px]">
              {REQUIREMENTS.map(([k, v]) => (
                <div key={k} className="contents">
                  <span className="font-mono text-[11.5px] uppercase tracking-[0.02em] text-ink45 pt-1">
                    {k}
                  </span>
                  <span className="text-ink pb-2">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 items-start border border-line border-l-[3px] border-l-ink bg-surface rounded-sm px-4 py-3.5">
            <Icon name="lock" size={18} className="mt-0.5 flex-none" />
            <span className="t-small">
              Your password is stored only as a salted hash, and your residency document is kept in
              a private area no other member can open.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
