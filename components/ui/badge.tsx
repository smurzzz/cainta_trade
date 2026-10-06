import type { ReactNode } from "react";
import { Icon } from "./icon";

type Variant =
  | "default"
  | "available"
  | "pending"
  | "exchanged"
  | "removed"
  | "warn"
  | "danger"
  | "accent"
  | "ink";

const BASE =
  "inline-flex items-center gap-1.5 px-[9px] py-1 rounded-xs border border-linestrong bg-surface font-mono text-[11px] leading-[1.3] tracking-[0.04em] uppercase whitespace-nowrap";

const VARIANTS: Record<Variant, string> = {
  default: "text-ink70",
  available: "text-olive border-[#c3d1bb] bg-olivetint",
  pending: "text-accentdeep border-[#e6c3b8] bg-accenttint",
  exchanged: "text-paper border-ink bg-ink",
  removed: "text-ink45 border-line bg-paper2",
  warn: "text-brass border-[#ddc78f] bg-brasstint",
  danger: "text-danger border-[#e2b9b2] bg-dangertint",
  accent: "text-white border-accent bg-accent",
  ink: "text-paper border-ink bg-ink",
};

export function Badge({
  variant = "default",
  size = "md",
  children,
  className = "",
}: {
  variant?: Variant;
  size?: "md" | "lg";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`${BASE} ${VARIANTS[variant]} ${
        size === "lg" ? "text-[10.5px] px-[11px] py-1.5" : ""
      } ${className}`}
    >
      {children}
    </span>
  );
}

/** Status word → badge variant (single source of truth for status colour). */
export function StatusBadge({ status }: { status: string }) {
  const v: Variant =
    status === "Available"
      ? "available"
      : status === "Pending"
        ? "pending"
        : status === "Exchanged"
          ? "exchanged"
          : status === "Removed" || status === "Expired"
            ? "removed"
            : "default";
  return <Badge variant={v}>{status}</Badge>;
}

export function Chip({
  on = false,
  children,
  className = "",
}: {
  on?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[7px] min-h-9 px-3.5 rounded-full border font-normal text-[13px] ${
        on
          ? "bg-ink border-ink text-paper"
          : "border-linestrong text-ink70 hover:border-ink hover:text-ink"
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function Rating({ stars, count }: { stars: number; count?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-brass text-[13px]">
      <Icon name="star" size={14} />
      <span>
        {stars.toFixed(1)}
        {count ? ` · ${count}` : ""}
      </span>
    </span>
  );
}
