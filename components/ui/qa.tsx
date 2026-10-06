'use client'

import { useState } from 'react'
import { Icon } from './icon'

/** Accordion FAQ (mockup .qa). */
export function QA({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="border-t border-line mt-6">
      {items.map((item, i) => (
        <div key={item.q} className="border-b border-line">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex items-center justify-between gap-5 py-5 text-base font-medium w-full text-left hover:text-accent"
            aria-expanded={open === i}
          >
            {item.q}
            <span
              className={`flex-none text-ink45 transition-transform duration-200 ${open === i ? 'rotate-45' : ''}`}
            >
              <Icon name="plus" size={18} />
            </span>
          </button>
          {open === i ? (
            <div className="pb-5 text-[15px] text-ink70 max-w-[70ch]">{item.a}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
