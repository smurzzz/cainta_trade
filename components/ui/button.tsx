import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant =
  | "primary"
  | "accent"
  | "secondary"
  | "ghost"
  | "danger"
  | "light"
  | "outlineLight";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 min-h-[46px] px-5 rounded-sm border border-transparent font-mono text-[13px] tracking-[0.01em] whitespace-nowrap transition-[background-color,color,border-color] duration-[180ms] ease-[cubic-bezier(.4,0,.2,1)]";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-accent",
  accent: "bg-accent text-white hover:bg-accentdeep",
  secondary:
    "bg-transparent text-ink border-linestrong hover:border-ink hover:bg-surface",
  ghost: "bg-transparent text-ink70 hover:text-ink hover:bg-paper2",
  danger:
    "bg-transparent text-danger border-[#e2b9b2] hover:bg-danger hover:text-white",
  light: "bg-paper text-ink hover:bg-white",
  outlineLight:
    "bg-transparent text-paper border-[rgba(247,244,239,.4)] hover:bg-[rgba(247,244,239,.12)]",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-[36px] px-[13px] text-xs",
  md: "",
  lg: "min-h-[54px] px-7 text-sm",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
};

/** Mockup .btn.is-loading: text hidden, spinner ring centred. */
function LoadingSpinner({ variant }: { variant: Variant }) {
  const ring =
    variant === "primary" || variant === "accent" || variant === "danger"
      ? "border-paper border-t-transparent"
      : "border-ink border-t-transparent";
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-0 m-auto w-[15px] h-[15px] rounded-full border-[1.5px] animate-spin ${ring}`}
      style={{ animationDuration: "0.7s" }}
    />
  );
}

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  className = "",
  children,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${
        block ? "w-full" : ""
      } ${className} ${
        loading ? "text-transparent pointer-events-none relative" : ""
      } disabled:opacity-[0.42] disabled:pointer-events-none`}
      {...rest}
    >
      {children}
      {loading ? <LoadingSpinner variant={variant} /> : null}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  block = false,
  href,
  className = "",
  children,
  ...rest
}: CommonProps & { href: string } & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href={href}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${
        block ? "w-full" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}
