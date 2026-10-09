import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "./badge";

/** Gradient photo frame with label fallback (mockup .photo-frame). */
export function PhotoFrame({
  src,
  alt,
  label,
  aspect = "4/5",
  className = "",
  sizes = "(max-width: 700px) 50vw, 320px",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  label?: string;
  aspect?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`relative bg-[linear-gradient(135deg,#efe9df,#e5ded1)] overflow-hidden ${className}`}
      style={{ aspectRatio: aspect.replace("/", " / ") }}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-[0.12em] uppercase text-ink45 text-center px-2">
          {label ?? alt}
        </span>
      )}
    </div>
  );
}

export type ItemCardData = {
  id: string;
  title: string;
  status: string;
  category: string;
  barangay: string;
  owner: string;
  ownerAvatar?: string;
  time?: string;
  lookingFor?: string;
  photo?: string | null;
  photoLabel?: string;
  saveCount?: number;
};

/** Browse / featured item card (mockup .item-card). */
export function ItemCard({
  item,
  href,
  saved = false,
  className = "",
}: {
  item: ItemCardData;
  href?: string;
  saved?: boolean;
  className?: string;
}) {
  const link = href ?? `/items/${item.id}`;
  return (
    <article
      className={`group bg-surface border border-line rounded-md overflow-hidden flex flex-col transition-[border-color,transform] duration-200 hover:border-linestrong hover:-translate-y-0.5 ${className}`}
    >
      <div className="relative">
        <Link href={link} className="block">
          <PhotoFrame src={item.photo} alt={item.title} label={item.photoLabel} aspect="4 / 5" />
        </Link>
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-[2]">
          <StatusBadge status={item.status} />
        </div>
        <button
          type="button"
          aria-label="Save to wishlist"
          className={`absolute top-2 right-2 z-[2] w-[34px] h-[34px] rounded-full bg-white/90 flex items-center justify-center ${
            saved ? "text-accent" : "text-ink hover:text-accent"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l8.8 8.9 8.8-8.9a5.5 5.5 0 0 0 0-7.8Z" />
          </svg>
        </button>
      </div>
      <div className="p-3.5 px-4 pb-4 flex flex-col gap-2 flex-1">
        <div className="t-label">
          {item.category} · {item.barangay}
        </div>
        <h3 className="text-base font-medium leading-[1.35]">
          <Link href={link} className="hover:text-accent">
            {item.title}
          </Link>
        </h3>
        {item.lookingFor ? (
          <div className="flex flex-wrap gap-1.5 text-[13.5px] text-ink70">
            <span>Looking for</span> <b className="font-medium text-ink">{item.lookingFor}</b>
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2.5 pt-3 border-t border-line">
          <span className="flex items-center gap-2.5">
            <Image
              src={item.ownerAvatar ?? "/assets/avatar-2.svg"}
              alt=""
              width={22}
              height={22}
              className="w-[22px] h-[22px] rounded-full object-cover bg-paper2 border border-line"
            />
            <span className="text-sm text-ink45">{item.owner}</span>
          </span>
          {typeof item.saveCount === "number" ? (
            <span className="font-mono text-[11.5px] tracking-[0.12em] uppercase text-ink45">
              {item.saveCount} saved
            </span>
          ) : (
            <span className="t-label">{item.time}</span>
          )}
        </div>
      </div>
    </article>
  );
}

/** Horizontal compact card (make-offer / dialogs). */
export function ItemCardCompact({
  item,
  href,
  className = "",
}: {
  item: ItemCardData;
  href?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3.5 p-3 bg-surface border border-line rounded-md ${className}`}>
      <PhotoFrame
        src={item.photo}
        alt={item.title}
        label={item.photoLabel}
        aspect="1 / 1"
        className="w-[76px] h-[76px] flex-none rounded-sm"
        sizes="76px"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium leading-[1.3] truncate">
          {href ? <Link href={href}>{item.title}</Link> : item.title}
        </div>
        <div className="t-meta mt-1 truncate">
          {item.category} · {item.barangay}
        </div>
      </div>
      <StatusBadge status={item.status} />
    </div>
  );
}
