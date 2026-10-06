import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./icon";

export const INPUT_BASE =
  "w-full min-h-[48px] px-3.5 py-3 bg-surface border border-linestrong rounded-sm text-[15.5px] leading-normal text-ink placeholder:text-ink45 transition-colors hover:border-ink45 focus:outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(200,69,42,.18)] disabled:bg-paper2 disabled:text-ink45 disabled:cursor-not-allowed";

/** Label (mono, not uppercase — matches the mockup) + hint/error + control. */
export function Field({
  label,
  required,
  hint,
  error,
  children,
  className = "",
}: {
  label?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-[7px] ${className}`}>
      {label ? (
        <span className="font-mono text-[12.5px] tracking-[0.02em] flex items-center gap-1.5 text-ink">
          {label}
          {required ? <span className="text-accent">*</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="text-[13.5px] text-danger flex items-center gap-1.5">
          <Icon name="alert" size={13} className="flex-none" />
          {error}
        </span>
      ) : hint ? (
        <span className="text-[13.5px] text-ink45">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({
  error = false,
  className = "",
  ...rest
}: ComponentProps<"input"> & { error?: boolean }) {
  return (
    <input
      aria-invalid={error ? true : undefined}
      className={`${INPUT_BASE} ${
        error ? "border-danger bg-[#fffafa]" : ""
      } ${className}`}
      {...rest}
    />
  );
}

export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`${INPUT_BASE} min-h-[128px] resize-y leading-[1.55] ${className}`}
      {...rest}
    />
  );
}

export function Select({
  error = false,
  className = "",
  children,
  ...rest
}: ComponentProps<"select"> & { error?: boolean }) {
  return (
    <select
      aria-invalid={error ? true : undefined}
      className={`${INPUT_BASE} ${
        error ? "border-danger bg-[#fffafa]" : ""
      } appearance-none pr-10 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%235c554b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")] bg-[length:14px] bg-[right_14px_center] bg-no-repeat ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

/** Custom checkbox / radio card (mockup .check and .radio-card). */
export function Check({
  radio = false,
  children,
  className = "",
  ...rest
}: ComponentProps<"input"> & { radio?: boolean }) {
  return (
    <label className={`flex items-start gap-2.5 text-[14.5px] text-ink70 ${className}`}>
      <input
        type={radio ? "radio" : "checkbox"}
        className={`appearance-none w-5 h-5 mt-px flex-none border border-linestrong bg-surface checked:bg-ink checked:border-ink checked:bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.4'%3E%3Cpath d='M20 6L9 17l-5-5'/%3E%3C/svg%3E")] checked:bg-center checked:bg-no-repeat ${
          radio ? "rounded-full checked:shadow-[inset_0_0_0_5px_var(--color-ink)] checked:bg-white" : "rounded-xs"
        }`}
        {...rest}
      />
      <span>{children}</span>
    </label>
  );
}

/** Toggle (mockup .switch). Rendered as a span — wire state in the parent. */
export function Switch({ on = false, className = "" }: { on?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative w-11 h-[26px] rounded-full flex-none ${
        on ? "bg-olive" : "bg-linestrong"
      } ${className}`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white transition-transform duration-[180ms] ${
          on ? "translate-x-[18px]" : ""
        }`}
      />
    </span>
  );
}

/** Labelled switch row (settings-style). */
export function SwitchRow({
  title,
  description,
  on,
}: {
  title: string;
  description?: string;
  on?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-3.5 border-b border-line last:border-b-0">
      <div>
        <div className="text-[15px] text-ink">{title}</div>
        {description ? <div className="text-[13.5px] text-ink45">{description}</div> : null}
      </div>
      <Switch on={on} />
    </div>
  );
}
