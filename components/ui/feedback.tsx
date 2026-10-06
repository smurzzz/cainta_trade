import type { ReactNode } from "react";
import { Icon } from "./icon";

type NoticeTone = "default" | "accent" | "brass" | "olive" | "danger" | "ink";

const NOTICE_TONES: Record<NoticeTone, string> = {
  default: "border-line border-l-[3px] border-l-ink bg-surface",
  accent: "border-[#e8cfc6] border-l-[3px] border-l-accent bg-accenttint",
  brass: "border-[#e3d3ac] border-l-[3px] border-l-brass bg-brasstint",
  olive: "border-[#c3d1bb] border-l-[3px] border-l-olive bg-olivetint",
  danger: "border-[#e2b9b2] border-l-[3px] border-l-danger bg-dangertint",
  ink: "border-ink border-l-[3px] border-l-accent bg-ink text-paper",
};

export function Notice({
  tone = "default",
  icon,
  children,
  className = "",
}: {
  tone?: NoticeTone;
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-3 items-start border rounded-sm px-4 py-3.5 text-[15px] ${NOTICE_TONES[tone]} ${className}`}
    >
      {icon ? <Icon name={icon} size={17} className="mt-0.5 flex-none" /> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Full-width banner strip (pending-approval bar etc.). */
export function Banner({
  tone = "ink",
  icon,
  children,
  aside,
  className = "",
}: {
  tone?: "ink" | "accent" | "brass";
  icon?: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  const t =
    tone === "accent"
      ? "bg-accent text-white"
      : tone === "brass"
        ? "bg-brasstint text-[#5c4512] border-t border-[#e3d3ac]"
        : "bg-ink text-paper";
  return (
    <div className={`flex items-center gap-3.5 px-[18px] py-3 text-[14.5px] flex-wrap ${t} ${className}`}>
      {icon ? <Icon name={icon} size={16} className="flex-none" /> : null}
      <span className="min-w-0">{children}</span>
      {aside ? <span className="ml-auto">{aside}</span> : null}
    </div>
  );
}

/** Empty state (mockup .empty). */
export function Empty({
  icon = "box",
  title,
  children,
  className = "",
}: {
  icon?: string;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center py-16 px-6 border border-dashed border-linestrong rounded-md bg-surface ${className}`}>
      <div className="w-[88px] h-[88px] mx-auto mb-5 rounded-full bg-paper2 flex items-center justify-center text-ink45">
        <Icon name={icon} size={36} />
      </div>
      <div className="font-display text-xl uppercase mb-2">{title}</div>
      {children ? <div className="t-small max-w-md mx-auto">{children}</div> : null}
    </div>
  );
}

/** Loading skeleton pieces (mockup .skeleton). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-[#ece6dc] rounded-xs animate-pulse ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-line rounded-md overflow-hidden">
      <Skeleton className="aspect-[4/5] rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** Three-item trust row (hero / safety panels). */
export function TrustRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[13.5px] text-ink70">
      <Icon name={icon} size={20} className="flex-none" />
      <span>{children}</span>
    </div>
  );
}
