import { Icon } from "./icon";

/** Numeric pagination (mockup .pagination). */
export function Pagination({ page = 1, total = 8 }: { page?: number; total?: number }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  const btn =
    "min-w-10 h-10 px-2.5 border border-line rounded-sm inline-flex items-center justify-center font-mono text-xs text-ink70 hover:border-ink hover:text-ink";
  const on = "bg-ink border-ink text-paper";
  return (
    <nav className="flex items-center justify-center gap-1 mt-10" aria-label="Pagination">
      <span className={`${btn} opacity-40 pointer-events-none`} aria-disabled="true">
        <Icon name="chevL" size={15} />
      </span>
      {pages.map((p) => (
        <span key={p} className={`${btn} ${p === page ? on : ""}`}>
          {p}
        </span>
      ))}
      <span className={btn}>
        <Icon name="chevR" size={15} />
      </span>
    </nav>
  );
}
