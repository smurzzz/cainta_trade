'use client'

import { useEffect } from 'react'
import { Icon } from './icon'

/** Modal dialog (mockup .overlay/.dialog): backdrop click + Escape close,
 *  42px tone circle, paper footer. `showClose` hides the X (mockup nudge dialog). */
export function Dialog({
  title,
  blurb,
  tone,
  icon,
  wide = false,
  showClose = true,
  onClose,
  children,
  footer,
}: {
  title: string
  blurb: string
  tone: 'accent' | 'danger' | 'olive'
  icon: string
  wide?: boolean
  showClose?: boolean
  onClose: () => void
  children?: React.ReactNode
  footer: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-[rgba(22,19,15,.48)] flex items-center justify-center p-6 z-[60] overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-surface rounded-md w-full ${wide ? 'max-w-[660px]' : 'max-w-[480px]'} shadow-pop overflow-hidden`}
      >
        <div className="flex gap-3.5 items-start px-[22px] pt-5">
          <span
            className={`w-[42px] h-[42px] rounded-full flex items-center justify-center flex-none ${
              tone === 'danger'
                ? 'bg-dangertint text-danger'
                : tone === 'olive'
                  ? 'bg-olivetint text-olive'
                  : 'bg-accenttint text-accent'
            }`}
          >
            <Icon name={icon} size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="t-h3">{title}</div>
            <p className="t-small mt-1">{blurb}</p>
          </div>
          {showClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 rounded-full inline-flex items-center justify-center hover:bg-paper2 flex-none"
            >
              <Icon name="x" size={18} />
            </button>
          ) : null}
        </div>
        {children ? <div className="px-[22px] pt-3.5 pb-5">{children}</div> : null}
        <div className="flex justify-end gap-2.5 px-[22px] py-4 bg-paper border-t border-line flex-wrap max-md:flex-col-reverse">
          {footer}
        </div>
      </div>
    </div>
  )
}
