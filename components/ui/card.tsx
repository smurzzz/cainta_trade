import type { ReactNode } from "react";

export function Panel({
  variant = "default",
  className = "",
  children,
}: {
  variant?: "default" | "paper" | "tint" | "ink";
  className?: string;
  children: ReactNode;
}) {
  const v =
    variant === "paper"
      ? "bg-paper2"
      : variant === "tint"
        ? "bg-accenttint border-[#e8cfc6]"
        : variant === "ink"
          ? "bg-ink text-paper border-ink"
          : "bg-surface";
  return (
    <div className={`border border-line rounded-md p-6 ${v} ${className}`}>
      {children}
    </div>
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`bg-surface border border-line rounded-md overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function CardHead({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-[18px] border-b border-line flex items-center justify-between gap-4 flex-wrap">
      {children}
    </div>
  );
}

export function CardBody({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFoot({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-4 border-t border-line bg-paper">{children}</div>
  );
}

/** Section heading with the mockup's eyebrow rule + right-side aside. */
export function SectionHead({
  label,
  title,
  aside,
  className = "",
}: {
  label?: string;
  title?: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-end justify-between gap-6 mb-7 max-md:flex-col max-md:items-start max-md:gap-3 max-md:mb-5 ${className}`}
    >
      <div>
        {label ? (
          <div className="eyebrow">
            <span className="t-label-accent">{label}</span>
          </div>
        ) : null}
        {title ? <h2 className="t-h2">{title}</h2> : null}
      </div>
      {aside ? <div className="flex-none">{aside}</div> : null}
    </div>
  );
}
