'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/icon'

type Variant = 'guest' | 'resident'

const GUEST_ITEMS = [
  { label: 'Browse', href: '/browse', icon: 'search' },
  { label: 'How it works', href: '/how-it-works', icon: 'info' },
  { label: 'Safety', href: '/how-it-works#safety', icon: 'shield' },
  { label: 'Log in', href: '/sign-in', icon: 'user' },
]

const RESIDENT_ITEMS = [
  { label: 'Home', href: '/home', icon: 'home', id: 'home' },
  { label: 'Browse', href: '/browse', icon: 'search', id: 'browse' },
  { label: 'Offers', href: '/offers', icon: 'swap', id: 'offers' },
  { label: 'Messages', href: '/messages', icon: 'chat', id: 'messages' },
  { label: 'Profile', href: '/members/marites', icon: 'user', id: 'profile' },
]

/** Sticky mobile bottom tab bar (mockup .mobile-bar), shown below 700px. */
export function MobileBar({ variant = 'guest' }: { variant?: Variant }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href.split('#')[0]

  if (variant === 'guest') {
    return (
      <nav aria-label="Guest navigation" className="md:hidden sticky bottom-0 z-50 bg-surface border-t border-line px-1.5 py-2">
        <div className="flex">
          {GUEST_ITEMS.map((i) => (
            <Link
              key={i.label}
              href={i.href}
              className="flex-1 flex flex-col items-center gap-1 font-mono text-[10.5px] tracking-[0.02em] uppercase text-ink45 py-1 min-h-12 justify-center"
            >
              <Icon name={i.icon} size={20} />
              {i.label}
            </Link>
          ))}
        </div>
      </nav>
    )
  }

  const [first, second, ...rest] = RESIDENT_ITEMS
  const item = (i: (typeof RESIDENT_ITEMS)[number]) => (
    <Link
      key={i.label}
      href={i.href}
      className={`flex-1 flex flex-col items-center gap-1 font-mono text-[10.5px] tracking-[0.02em] uppercase py-1 min-h-12 justify-center ${
        isActive(i.href) ? 'text-accent' : 'text-ink45'
      }`}
    >
      <Icon name={i.icon} size={20} />
      {i.label}
    </Link>
  )

  return (
    <nav aria-label="Resident navigation" className="md:hidden sticky bottom-0 z-50 bg-surface border-t border-line px-1.5 py-2">
      <div className="flex">
        {item(first)}
        {item(second)}
        <Link
          href="/items/new"
          aria-label="Post an item"
          className="w-[52px] h-[52px] rounded-full bg-ink text-paper inline-flex items-center justify-center -mt-5 mx-1.5 flex-none hover:bg-accent"
        >
          <Icon name="plus" size={22} />
        </Link>
        {rest.map(item)}
      </div>
    </nav>
  )
}
