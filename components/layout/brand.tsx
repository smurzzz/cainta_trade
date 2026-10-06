import Link from "next/link";
import { BrandMark } from "@/components/ui/icon";

/** Brand lockup: mark + CaintaTrade / Cainta, Rizal (mockup brandBlock). */
export function Brand({
  href = "/",
  sub = "Cainta, Rizal",
  markSize = 30,
  textSize = "text-[19px]",
  className = "",
}: {
  href?: string;
  sub?: string | null;
  markSize?: number;
  textSize?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 flex-none ${className}`}>
      <BrandMark size={markSize} />
      <span>
        <span className={`font-display font-bold text-[19px] leading-none tracking-[0.16em] uppercase ${textSize}`}>
          CaintaTrade
        </span>
        {sub ? (
          <span className="block font-mono text-[9.5px] tracking-[0.16em] uppercase text-ink45 mt-px">
            {sub}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
