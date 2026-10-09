import { Icon } from "./icon";

/** Numeric pagination (mockup .pagination). With `onSelect` the pages become
 *  buttons (client navigation); without it the mockup renders static spans. */
export function Pagination({
  page = 1,
  total = 8,
  onSelect,
}: {
  page?: number;
  total?: number;
  onSelect?: (p: number) => void;
}) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  const btn =
    "min-w-10 h-10 px-2.5 border border-line rounded-sm inline-flex items-center justify-center font-mono text-xs text-ink70 hover:border-ink hover:text-ink";
  const on = "bg-ink border-ink text-paper";
  const canPrev = page > 1;
  const canNext = page < total;

  const cell = (key: string | number, target: number, content: React.ReactNode, cls: string, disabled: boolean) => {
    if (onSelect && !disabled) {
      return (
        <button key={key} type="button" onClick={() => onSelect(target)} className={`${btn} ${cls}`}>
          {content}
        </button>
      );
    }
    return (
      <span key={key} className={`${btn} ${cls} ${disabled ? "opacity-40 pointer-events-none" : ""}`} aria-disabled={disabled || undefined}>
        {content}
      </span>
    );
  };

  return (
    <nav className="flex items-center justify-center gap-1 mt-10" aria-label="Pagination">
      {cell("prev", page - 1, <Icon name="chevL" size={15} />, "", !canPrev)}
      {pages.map((p) => cell(p, p, p, p === page ? on : "", false))}
      {cell("next", page + 1, <Icon name="chevR" size={15} />, "", !canNext)}
    </nav>
  );
}
