/**
 * Icon set ported 1:1 from the mockup's app.js (PATHS map + icon() renderer).
 * 24x24 viewBox, stroke=currentColor, stroke-width 1.5, round caps/joins.
 */
const PATHS: Record<string, string> = {
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z M12 10a2 2 0 1 0 0-.01",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M21 21l-4.3-4.3",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M22 21v-2a4 4 0 0 0-3-3.9",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l8.8 8.9 8.8-8.9a5.5 5.5 0 0 0 0-7.8Z",
  plus: "M12 5v14 M5 12h14",
  check: "M20 6 9 17l-5-5",
  x: "M18 6 6 18 M6 6l12 12",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  arrowNe: "M7 17 17 7 M8 7h9v9",
  chevL: "M15 18l-6-6 6-6",
  chevR: "M9 6l6 6-6 6",
  chevD: "M6 9l6 6 6-6",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  list: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  filter: "M3 6h18 M7 12h10 M10 18h4",
  swap: "M7 4 3 8l4 4 M3 8h14 M17 20l4-4-4-4 M21 16H7",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z",
  box: "M21 8v13H3V8 M1 3h22v5H1z M10 12h4",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  alert:
    "M12 9v4 M12 17h.01 M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 16v-4 M12 8h.01",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 6v6l4 2",
  camera:
    "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  trash: "M3 6h18 M8 6V4h8v2 M19 6l-1 15H6L5 6",
  edit: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  star: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a7.9 7.9 0 0 0 0-2l2-1.6-2-3.4-2.3 1a8 8 0 0 0-1.7-1L15 5.5h-4L10.6 8a8 8 0 0 0-1.7 1l-2.3-1-2 3.4L6.6 13a7.9 7.9 0 0 0 0 2l-2 1.6 2 3.4 2.3-1a8 8 0 0 0 1.7 1L11 22.5h4l.4-2.5a8 8 0 0 0 1.7-1l2.3 1 2-3.4Z",
  home: "M3 10.5 12 3l9 7.5V21H3z",
  flag: "M4 22V4h11l-1 4h7l-2 6 2 6H4",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
  chart: "M3 3v18h18 M7 15v3 M12 10v8 M17 6v12",
  mail: "M2 5h20v14H2z M2 7l10 6 10-6",
  lock: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
  phone:
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z",
  refresh:
    "M3 12a9 9 0 0 1 15.5-6.2L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15.5 6.2L3 16 M3 21v-5h5",
  tools: "M14.7 6.3a4 4 0 1 0 5 5L21 21 3 3l9.7-3.7z",
  tag: "M20.6 13.4 12 22l-9-9V3h10z M7.5 7.5h.01",
};

export type IconName = keyof typeof PATHS | string;

export function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const d = PATHS[name] || PATHS.info;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {d.split(" M").map((p, i) => (
        <path key={i} d={(i ? "M" : "") + p} />
      ))}
    </svg>
  );
}

/** The CaintaTrade mark: ink square, crossed swap strokes (paper + accent). */
export function BrandMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`brand__mark ${className}`}
    >
      <rect width="32" height="32" rx="4" fill="#16130f" />
      <path d="M9 21.5 15 8.5" stroke="#f7f4ef" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M23 21.5 17 8.5" stroke="#c8452a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11.5 18h9" stroke="#f7f4ef" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
