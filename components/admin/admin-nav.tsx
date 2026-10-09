'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/icon'

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: 'home' },
  { href: '/admin/users', label: 'Users', icon: 'users' },
  { href: '/admin/listings', label: 'Listings', icon: 'box' },
  { href: '/admin/trades', label: 'Trades', icon: 'swap' },
  { href: '/admin/reports', label: 'Reports', icon: 'flag' },
  { href: '/admin/categories', label: 'Categories', icon: 'tag' },
  { href: '/admin/audit', label: 'Audit log', icon: 'folder' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
]

/** docs/02 D · admin sidebar. Desktop: sticky column; mobile: horizontal scroll
 *  strip above the content. */
export function AdminNav({ pendingUsers, openReports }: { pendingUsers: number; openReports: number }) {
  const pathname = usePathname()
  const badge = (href: string) =>
    href === '/admin/users' && pendingUsers
      ? pendingUsers
      : href === '/admin/reports' && openReports
        ? openReports
        : undefined

  return (
    <nav
      aria-label="Admin"
      className="md:sticky md:top-24 md:self-start -mx-1 md:mx-0 overflow-x-auto"
    >
      <ul className="flex md:flex-col gap-1 min-w-max md:min-w-0 px-1 md:px-0">
        {LINKS.map((l) => {
          const active = pathname === l.href
          const count = badge(l.href)
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm border font-mono text-[12.5px] tracking-[0.03em] uppercase whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-ink text-paper border-ink'
                    : 'border-line text-ink70 hover:text-ink hover:border-linestrong'
                }`}
              >
                <Icon name={l.icon} size={15} />
                {l.label}
                {count ? (
                  <span
                    className={`ml-auto min-w-[20px] h-5 px-1.5 rounded-full text-[11px] inline-flex items-center justify-center ${
                      active ? 'bg-accent text-white' : 'bg-accenttint text-[#7d3322]'
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
