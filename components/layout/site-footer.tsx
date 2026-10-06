import Link from 'next/link'
import { Brand } from './brand'

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Trade',
    links: [
      { label: 'Browse items', href: '/browse' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Safe trading', href: '/how-it-works#safety' },
      { label: 'Post an item', href: '/items/new' },
    ],
  },
  {
    title: 'Cainta',
    links: [
      { label: 'Barangay coverage', href: '/how-it-works#coverage' },
      { label: 'Meetup spots', href: '/how-it-works#meetup' },
      { label: 'Community rules', href: '/legal' },
      { label: 'Report a listing', href: '/report' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Log in', href: '/sign-in' },
      { label: 'Register', href: '/sign-up' },
      { label: 'My listings', href: '/my-listings' },
      { label: 'Settings', href: '/settings' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Use', href: '/legal' },
      { label: 'Data Privacy Notice', href: '/legal#privacy' },
      { label: 'Help & support', href: '/how-it-works#faq' },
      { label: 'Contact', href: '/how-it-works#faq' },
    ],
  },
]

/** Ink footer with link columns and the LGU non-affiliation notice. */
export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper pt-14 pb-7">
      <div className="wrap">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          <div>
            <Brand />
            <p className="t-small mt-4 text-[rgba(247,244,239,.7)] max-w-[34ch]">
              A free exchange for Cainta residents. Trade what you have for what you need — no cash,
              no delivery, just neighbours.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <span className="text-[rgba(247,244,239,.5)] font-mono text-[11.5px] tracking-[0.12em] uppercase">
                Cainta · Rizal
              </span>
              <span className="text-[rgba(247,244,239,.5)] font-mono text-[11.5px] tracking-[0.12em] uppercase">
                7 barangays
              </span>
            </div>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <div className="text-[rgba(247,244,239,.5)] font-mono text-[11.5px] tracking-[0.12em] uppercase mb-3">
                {c.title}
              </div>
              {c.links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="block text-[14.5px] py-[5px] text-[rgba(247,244,239,.72)] hover:text-paper hover:underline underline-offset-[3px]"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-11 pt-[22px] border-t border-[rgba(247,244,239,.16)] text-[13px] text-[rgba(247,244,239,.6)]">
          <span>© 2026 CaintaTrade. A community project for Cainta, Rizal.</span>
          <span>Made for neighbours · No payments · No delivery</span>
        </div>
        <div className="mt-5 pt-[18px] border-t border-[rgba(247,244,239,.16)] text-[13.5px] leading-[1.55] text-[rgba(247,244,239,.78)] max-w-[92ch]">
          CaintaTrade is an independent community project. It is{' '}
          <b className="text-paper font-semibold">
            not affiliated with the Cainta municipal government (LGU)
          </b>
          , the barangay councils, or any mall, market or business named in these screens — those
          names only describe popular public meetup places.
        </div>
      </div>
    </footer>
  )
}
