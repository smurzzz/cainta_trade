import type { ReactNode } from "react";
import { Icon } from "./icon";

/** Underline tab bar (mockup .tabbar/.tab). Pass onSelect to make it interactive. */
export function TabBar({
  tabs,
  active,
  onSelect,
  className = "",
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const cls = (on: boolean) =>
    `px-4 py-3 font-mono text-xs tracking-[0.02em] uppercase whitespace-nowrap border-b-2 ${
      on ? "text-ink border-accent" : "text-ink45 border-transparent hover:text-ink"
    }`;
  return (
    <div
      role="tablist"
      className={`flex gap-0.5 border-b border-line overflow-x-auto ${className}`}
    >
      {tabs.map((t) => {
        const inner = (
          <>
            {t.label}
            {typeof t.count === "number" ? (
              <span className="ml-2 text-ink45">{t.count}</span>
            ) : null}
          </>
        );
        return onSelect ? (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            onClick={() => onSelect(t.id)}
            className={`${cls(t.id === active)} cursor-pointer`}
          >
            {inner}
          </button>
        ) : (
          <span key={t.id} className={cls(t.id === active)}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

/** Pill segmented control (mockup .segmented). Pass onSelect to make it interactive. */
export function Segmented({
  options,
  active,
  onSelect,
  className = "",
}: {
  options: { id: string; label: string }[];
  active: string;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      className={`inline-flex max-md:flex-wrap border border-linestrong rounded-full p-[3px] gap-0.5 ${className}`}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === active}
          onClick={() => onSelect?.(o.id)}
          className={`px-3.5 py-1.5 rounded-full font-mono text-xs tracking-[0.02em] uppercase cursor-pointer transition-colors ${
            o.id === active ? "bg-ink text-paper" : "text-ink70 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Icon + text link that nudges on hover (mockup .link-arrow). */
export function LinkArrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[12.5px] tracking-[0.02em] hover:text-accent hover:gap-3 transition-all ${className}`}
    >
      {children}
      <Icon name="arrow" size={15} />
    </span>
  );
}
