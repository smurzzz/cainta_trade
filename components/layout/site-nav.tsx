'use client';

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useClerk, useUser } from '@clerk/nextjs'
import { Brand } from './brand'
import { Icon } from '@/components/ui/icon'
import { Banner } from '@/components/ui/feedback'

type Variant = 'guest' | 'resident' | 'pending'

const GUEST_LINKS = [
  { label: 'Browse', href: '/browse' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Safety', href: '/how-it-works#safety' },
  { label: 'About', href: '/legal' },
]

const RESIDENT_LINKS = [
  { label: 'Home', href: '/home' },
  { label: 'Browse', href: '/browse' },
  { label: 'My listings', href: '/my-listings' },
  { label: 'Offers', href: '/offers' },
  { label: 'Messages', href: '/messages' },
]

function NavLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`font-mono text-xs tracking-[0.04em] uppercase py-1.5 border-b transition-colors ${
        active ? 'text-ink border-ink' : 'text-ink70 border-transparent hover:text-ink'
      }`}
    >
      {label}
    </Link>
  )
}

function NavCount({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full bg-accent text-white font-mono text-[9.5px] leading-none">
      {n}
    </span>
  )
}

/** Site header: sticky paper bar with desktop links, mobile topbar and
 *  (for the pending variant) the brass approval banner. */
export function SiteNav({ variant = 'guest', notifications = 3 }: { variant?: Variant; notifications?: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { user } = useUser()
  const { signOut } = useClerk()

  const links = variant === 'guest' ? GUEST_LINKS : RESIDENT_LINKS
  const isActive = (href: string) => pathname === href.split('#')[0]
  const name = user?.firstName || 'Marites'
  const avatar = user?.imageUrl || '/assets/avatar-2.svg'

  return (
    <header className="bg-paper border-b border-line relative z-40 sticky top-0">
      {/* desktop */}
      <div className="wrap hidden md:flex items-center gap-8 py-[18px]">
        <Brand />
        <nav className="flex items-center gap-[26px]" aria-label={variant}>
          {links.map((l) => (
            <NavLink key={l.href} label={l.label} href={l.href} active={isActive(l.href)} />
          ))}
        </nav>
        <div className="flex items-center gap-3.5 ml-auto">
          {variant === 'guest' ? (
            <>
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center gap-2 min-h-[36px] px-[13px] rounded-sm font-mono text-xs text-ink70 hover:text-ink hover:bg-paper2"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 min-h-[36px] px-[13px] rounded-sm bg-ink text-paper font-mono text-xs hover:bg-accent"
              >
                Join free
              </Link>
            </>
          ) : (
            <>
              <Link
                href={variant === 'pending' ? '/account-status' : '/items/new'}
                className={`inline-flex items-center justify-center gap-2 min-h-[36px] px-[13px] rounded-sm bg-ink text-paper font-mono text-xs hover:bg-accent ${
                  variant === 'pending' ? 'opacity-[0.42] pointer-events-none' : ''
                }`}
              >
                <Icon name="plus" size={14} />
                Post an item
              </Link>
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="relative w-10 h-10 rounded-full border border-linestrong inline-flex items-center justify-center hover:bg-paper2"
              >
                <Icon name="bell" size={20} />
                {notifications > 0 ? (
                  <span className="absolute top-0.5 right-0.5">
                    <NavCount n={notifications} />
                  </span>
                ) : null}
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={open}
                  className="flex items-center gap-2 p-1 pl-2.5 border border-line rounded-full hover:border-linestrong hover:bg-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatar} alt="" className="w-[30px] h-[30px] rounded-full object-cover bg-paper2 border border-line" />
                  <span className="text-[13px] font-medium">{name}</span>
                  <Icon name="chevD" size={14} />
                </button>
                {open ? (
                  <div className="absolute top-full right-0 mt-2 min-w-[212px] bg-surface border border-line rounded-md shadow-pop p-1.5 z-70">
                    <Link href={`/members/${user?.id ?? ''}`} className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[14.5px] text-ink70 hover:bg-paper2 hover:text-ink" onClick={() => setOpen(false)}>
                      <Icon name="user" size={16} /> Profile
                    </Link>
                    <Link href="/settings" className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[14.5px] text-ink70 hover:bg-paper2 hover:text-ink" onClick={() => setOpen(false)}>
                      <Icon name="settings" size={16} /> Settings
                    </Link>
                    <Link href="/wishlist" className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[14.5px] text-ink70 hover:bg-paper2 hover:text-ink" onClick={() => setOpen(false)}>
                      <Icon name="heart" size={16} /> Wishlist
                    </Link>
                    <span className="block h-px bg-line my-1.5 mx-1" />
                    <button
                      type="button"
                      onClick={() => signOut({ redirectUrl: '/' })}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-[14.5px] text-ink70 hover:bg-paper2 hover:text-ink"
                    >
                      <Icon name="logout" size={16} /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {/* mobile topbar */}
      <div className="wrap flex md:hidden items-center gap-3 py-3 border-b border-line">
        <Brand />
        <div className="flex items-center gap-3 ml-auto">
          {variant === 'guest' ? (
            <>
              <Link href="/browse" aria-label="Search" className="w-10 h-10 rounded-full inline-flex items-center justify-center hover:bg-paper2">
                <Icon name="search" size={20} />
              </Link>
              <Link href="/sign-up" className="inline-flex items-center justify-center min-h-[36px] px-[13px] rounded-sm bg-ink text-paper font-mono text-xs hover:bg-accent">
                Join
              </Link>
            </>
          ) : (
            <>
              <Link href="/notifications" aria-label="Notifications" className="relative w-10 h-10 rounded-full inline-flex items-center justify-center hover:bg-paper2">
                <Icon name="bell" size={20} />
                {notifications > 0 ? (
                  <span className="absolute top-0.5 right-0.5">
                    <NavCount n={notifications} />
                  </span>
                ) : null}
              </Link>
              <Link href="/settings">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar} alt="" className="w-[30px] h-[30px] rounded-full object-cover bg-paper2 border border-line" />
              </Link>
            </>
          )}
        </div>
      </div>

      {variant === 'pending' ? (
        <Banner
          tone="brass"
          icon="clock"
          aside={
            <Link
              href="/account-status"
              className="inline-flex items-center justify-center min-h-[36px] px-[13px] rounded-sm border border-[#b39a58] text-[#5c4512] font-mono text-xs hover:bg-[rgba(92,69,18,.08)]"
            >
              Check status
            </Link>
          }
        >
          Pending approval — you can browse and edit your profile. Posting, offers and messaging
          open once an administrator approves your residency proof, usually within 24 hours.
        </Banner>
      ) : null}
    </header>
  )
}
