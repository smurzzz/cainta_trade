'use client'

import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Icon } from './icon'
import { INPUT_BASE } from './field'

const LABEL = 'font-mono text-[12.5px] tracking-[0.02em] flex items-center gap-1.5 text-ink'
const HINT = 'text-[13.5px] text-ink45'
const ERROR = 'text-[13.5px] text-danger flex items-center gap-1.5'

function FieldShell({
  label,
  required,
  hint,
  error,
  id,
  children,
  className = '',
}: {
  label?: string
  required?: boolean
  hint?: ReactNode
  error?: string
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-[7px] ${className}`}>
      {label ? (
        <label htmlFor={id} className={LABEL}>
          {label}
          {required ? <span className="text-accent">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className={ERROR}>
          <Icon name="alert" size={13} className="flex-none" />
          {error}
        </span>
      ) : hint ? (
        <span className={HINT}>{hint}</span>
      ) : null}
    </div>
  )
}

/** Mockup .strength — 4 bars, live label, optional field__ok line. */
export function StrengthMeter({
  value,
  okText,
  className = '',
}: {
  value: string
  okText?: string
  className?: string
}) {
  const v = value
  let score = 0
  if (v.length >= 8) score++
  if (/[0-9]/.test(v) && v.length >= 10) score++
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++
  if (/[^A-Za-z0-9]/.test(v) && v.length >= 12) score++

  const words = [
    'Too short — use at least 15 characters',
    'Weak — add a number or a symbol',
    'Fair — mix in a capital letter',
    'Strong password',
  ]
  const label = v
    ? v.length < 15
      ? words[0]
      : words[Math.max(0, score - 1)]
    : 'Use 15+ characters with a mix of letters and numbers.'
  const barColor = (i: number) =>
    i === 0 ? 'bg-danger' : i === 1 ? 'bg-brass' : 'bg-olive'

  return (
    <div className={`mt-2.5 ${className}`}>
      <div className="flex gap-[5px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? barColor(i) : 'bg-line'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
        <span className="t-meta">{label}</span>
        {okText && score >= 3 ? (
          <span className="text-[13.5px] text-olive flex items-center gap-1.5">
            <Icon name="check" size={13} /> {okText}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** Mockup .input-affix — password input + eye toggle (+ optional strength). */
export function PasswordField({
  label,
  required,
  hint,
  error,
  strength = false,
  strengthOkText,
  className = '',
  ...rest
}: ComponentProps<'input'> & {
  label?: string
  required?: boolean
  hint?: ReactNode
  error?: string
  strength?: boolean
  strengthOkText?: string
  className?: string
}) {
  const id = useId()
  const [show, setShow] = useState(false)
  const value = typeof rest.value === 'string' ? rest.value : ''
  return (
    <FieldShell
      label={label}
      required={required}
      hint={hint}
      error={error}
      id={id}
      className={className}
    >
      <div className="relative block">
        <input
          id={id}
          {...rest}
          type={show ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          className={`${INPUT_BASE} pr-11 ${
            error ? 'border-danger bg-[#fffafa]' : ''
          }`}
        />
        <button
          type="button"
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={() => setShow((s) => !s)}
          className="absolute right-1 top-0 bottom-0 w-[38px] inline-flex items-center justify-center text-ink45 rounded-sm hover:text-ink"
        >
          <Icon name="eye" size={18} />
        </button>
      </div>
      {strength ? <StrengthMeter value={value} okText={strengthOkText} /> : null}
    </FieldShell>
  )
}

/** Mockup .input-prefix — +63 addon + numeric input. */
export function PhoneField({
  label,
  required,
  hint,
  error,
  className = '',
  ...rest
}: ComponentProps<'input'> & {
  label?: string
  required?: boolean
  hint?: ReactNode
  error?: string
  className?: string
}) {
  const id = useId()
  return (
    <FieldShell
      label={label}
      required={required}
      hint={hint}
      error={error}
      id={id}
      className={className}
    >
      <div className="flex items-center">
        <span className="min-h-[48px] inline-flex items-center px-3 border border-linestrong border-r-0 rounded-l-sm bg-paper2 text-sm text-ink70 flex-none">
          +63
        </span>
        <input
          id={id}
          {...rest}
          aria-invalid={error ? true : undefined}
          className={`${INPUT_BASE} rounded-l-none ${
            error ? 'border-danger bg-[#fffafa]' : ''
          }`}
        />
      </div>
    </FieldShell>
  )
}

/** Mockup 6-digit code input (mono, wide letter-spacing, 18px). */
export function CodeInput({
  className = '',
  ...rest
}: ComponentProps<'input'>) {
  return (
    <input
      inputMode="numeric"
      maxLength={6}
      placeholder="6-digit code"
      {...rest}
      className={`${INPUT_BASE} font-mono text-[18px] tracking-[0.4em] ${
        rest['aria-invalid'] ? 'border-danger bg-[#fffafa]' : ''
      } ${className}`}
    />
  )
}
