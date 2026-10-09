/** Time helpers kept outside components: react-hooks/purity forbids calling
 *  Date.now() directly in a component body, so render code calls these
 *  (imported functions stay opaque to the rule). */

export function msSince(iso: string | number | Date) {
  return Date.now() - new Date(iso).getTime()
}

export function isOlderThan(iso: string | null | undefined, ms: number) {
  if (!iso) return false
  return msSince(iso) > ms
}

export function relTime(iso: string | null | undefined) {
  if (!iso) return 'recently'
  const mins = Math.floor(msSince(iso) / 60_000)
  if (mins < 60) return `${Math.max(1, mins)} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** True when `iso` is less than `ms` away from now (expiring in a day, …). */
export function isWithin(iso: string | null | undefined, ms: number) {
  if (!iso) return false
  return new Date(iso).getTime() - Date.now() < ms
}

/** True once `iso` has passed — a due meetup time, a missed deadline. */
export function hasArrived(iso: string | null | undefined) {
  if (!iso) return false
  return new Date(iso).getTime() <= Date.now()
}

/** Short relative age for cards and tables ("4h ago"). */
export function timeAgo(iso: string | null | undefined) {
  if (!iso) return 'recently'
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`
  if (secs < 86_400) return `${Math.floor(secs / 3600)}h ago`
  const days = Math.floor(secs / 86_400)
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}
