import Link from 'next/link'
import type { ReactNode } from 'react'
import { ButtonLink } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

type IconName = React.ComponentProps<typeof Icon>['name']

/** docs/02 E32 · error pages always show one primary action, a way back to
 *  browsing and (for 403/500) a reference code members can quote in a report. */
export function StatusPage({
  code,
  kicker,
  title,
  blurb,
  refCode,
  primary,
  action,
  icon = 'alert',
}: {
  code: string
  kicker: string
  title: string
  blurb: string
  refCode?: string
  primary: { label: string; href: string }
  /** Optional client-side action rendered beside the primary link. */
  action?: ReactNode
  icon?: IconName
}) {
  return (
    <main className="min-h-full flex items-center justify-center px-5 py-14">
      <div className="w-full max-w-[560px]">
        <div className="flex items-center gap-2.5 mb-10">
          <span className="w-3 h-3 bg-accent flex-none" aria-hidden="true" />
          <span className="t-h3">CaintaTrade</span>
        </div>

        <div className="border border-line rounded-md bg-surface p-8">
          <div className="flex items-start gap-5">
            <span className="flex-none w-12 h-12 rounded-full bg-paper2 border border-line flex items-center justify-center">
              <Icon name={icon} size={22} />
            </span>
            <div className="min-w-0">
              <div className="t-meta mb-1">
                {kicker} · error {code}
              </div>
              <h1 className="t-h1">{title}</h1>
              <p className="t-body mt-3 text-ink70">{blurb}</p>
            </div>
          </div>

          {refCode ? (
            <div className="mt-6 border border-dashed border-linestrong rounded-sm px-3.5 py-3">
              <div className="t-meta mb-1">Reference code</div>
              <code className="font-mono text-[14px] text-ink">{refCode}</code>
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={primary.href} variant="primary">
              {primary.label}
            </ButtonLink>
            {action}
          </div>

          <p className="t-small mt-6 pt-5 border-t border-line text-ink45">
            CaintaTrade is an independent community project for Cainta, Rizal — not affiliated
            with the Cainta municipal government (LGU).{' '}
            <Link href="/how-it-works" className="underline underline-offset-[3px] hover:text-accent">
              How it works
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
