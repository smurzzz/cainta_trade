'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ButtonLink } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { ItemCard } from '@/components/ui/item-card'
import { Pagination } from '@/components/ui/pagination'
import { Chip } from '@/components/ui/badge'
import type { ListItemsResult } from '@/lib/queries/catalog'

function FacetGroup({
  title,
  children,
  onClear,
}: {
  title: string
  onClear?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="py-[18px] border-b border-line first:pt-0 last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <span className="t-label-ink">{title}</span>
        {onClear ? (
          <button type="button" onClick={onClear} className="t-label hover:text-ink">
            Clear
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'views', label: 'Most viewed' },
  { value: 'saves', label: 'Most saved' },
]

/** Browse screen (mockup a2) backed by real catalog queries (docs/03 3.15).
 *  The URL is the source of truth: every control patches the query string and
 *  the server re-renders results + facets; the search box debounces. */
export function BrowseScreen({ initial }: { initial: ListItemsResult }) {
  const router = useRouter()
  const applied = initial.applied
  const searchRef = useRef(paramsFrom(applied).toString())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [sheet, setSheet] = useState(false)

  // keep the cached query string in step with the server echo after each
  // navigation (push() writes it optimistically for back-to-back patches)
  const echoedQs = paramsFrom(applied).toString()
  useEffect(() => {
    searchRef.current = echoedQs
  }, [echoedQs])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  function paramsFrom(a: ListItemsResult['applied']) {
    const params = new URLSearchParams()
    if (a.q) params.set('q', a.q)
    if (a.category) params.set('category', a.category)
    if (a.barangay) params.set('barangay', a.barangay)
    if (a.condition) params.set('condition', a.condition)
    if (a.includeExchanged) params.set('exchanged', '1')
    if (a.since) params.set('since', a.since)
    if (a.sort !== 'newest') params.set('sort', a.sort)
    if (a.page > 1) params.set('page', String(a.page))
    return params
  }

  /** Patch the URL (null deletes a param). Filter changes reset to page 1. */
  function push(patch: Record<string, string | null>, opts: { scroll?: boolean } = {}) {
    const params = new URLSearchParams(searchRef.current)
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    if (!('page' in patch)) params.delete('page')
    const qs = params.toString()
    searchRef.current = qs
    router.replace(qs ? `/browse?${qs}` : '/browse', { scroll: opts.scroll ?? false })
  }

  function scheduleSearch(value: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const v = value.trim()
      const current = new URLSearchParams(searchRef.current).get('q') ?? ''
      if (v !== current) push({ q: v || null })
    }, 350)
  }

  function clearAll() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (inputRef.current) inputRef.current.value = ''
    push({
      q: null,
      category: null,
      barangay: null,
      condition: null,
      exchanged: null,
      since: null,
      sort: null,
    })
  }

  const facetBtn = (active: boolean) =>
    `flex items-center justify-between gap-2 py-1.5 text-[14.5px] w-full text-left ${
      active ? 'text-ink font-medium' : 'text-ink70 hover:text-ink'
    }`

  const popularCats = initial.facets.categories.slice(0, 3)
  const popularBrgy =
    initial.facets.barangays.find((b) => b.key === 'san-andres') ?? initial.facets.barangays[0]

  return (
    <>
      {/* header band */}
      <section className="bg-paper2 border-b border-line py-9">
        <div className="wrap">
          <div className="eyebrow">
            <span className="t-label-accent">
              {initial.total} items across {initial.facets.barangays.length} barangays
            </span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="t-h1">Browse items</h1>
              <p className="t-small mt-3 max-w-[560px]">
                Everything below is offered by a neighbour in Cainta. Filter by barangay to keep
                trades within walking distance.
              </p>
            </div>
            <div className="flex flex-col gap-2" style={{ minWidth: 240 }}>
              <ButtonLink href="/sign-up" className="w-full">
                Log in to post or offer
              </ButtonLink>
              <span className="t-meta">Free account · Cainta residents only</span>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap py-7 md:py-11">
        {/* filter bar */}
        <div className="border border-line rounded-md bg-surface p-4">
          <div className="flex flex-wrap gap-3">
            <label className="relative block flex-1" style={{ minWidth: 240 }}>
              <input
                ref={inputRef}
                type="search"
                defaultValue={applied.q}
                onChange={(e) => scheduleSearch(e.target.value)}
                placeholder="Search items — sofa, fan, bike…"
                aria-label="Search items"
                className="w-full min-h-[48px] py-3 pl-3.5 pr-11 bg-surface border border-linestrong rounded-sm text-[15.5px] text-ink placeholder:text-ink45 hover:border-ink45 focus:outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(200,69,42,.18)]"
              />
              <span className="absolute right-1 top-0 bottom-0 w-[38px] inline-flex items-center justify-center text-ink45">
                <Icon name="search" size={18} />
              </span>
            </label>
            <select
              aria-label="Category"
              value={applied.category ?? ''}
              onChange={(e) => push({ category: e.target.value || null })}
              className="min-h-[48px] px-3.5 py-3 bg-surface border border-linestrong rounded-sm text-[15.5px] text-ink appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235c554b%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10 max-w-[190px]"
            >
              <option value="">All categories</option>
              {initial.facets.categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Condition"
              value={applied.condition ?? ''}
              onChange={(e) => push({ condition: e.target.value || null })}
              className="min-h-[48px] px-3.5 py-3 bg-surface border border-linestrong rounded-sm text-[15.5px] text-ink appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235c554b%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10 max-w-[170px]"
            >
              <option value="">Any condition</option>
              {initial.facets.conditions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Barangay"
              value={applied.barangay ?? ''}
              onChange={(e) => push({ barangay: e.target.value || null })}
              className="min-h-[48px] px-3.5 py-3 bg-surface border border-linestrong rounded-sm text-[15.5px] text-ink appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235c554b%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10 max-w-[180px]"
            >
              <option value="">All barangays</option>
              {initial.facets.barangays.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSheet(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[36px] px-[13px] rounded-sm border border-linestrong text-ink font-mono text-xs hover:border-ink hover:bg-surface"
            >
              <Icon name="filter" size={15} />
              More filters
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="t-label mr-1">Popular</span>
            {popularCats.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => push({ category: applied.category === c.key ? null : c.key })}
              >
                <Chip on={applied.category === c.key}>
                  {c.label}{' '}
                  <span className="font-mono text-[10.5px] text-ink45">{c.n}</span>
                </Chip>
              </button>
            ))}
            {popularBrgy ? (
              <button
                type="button"
                onClick={() => push({ barangay: applied.barangay === popularBrgy.key ? null : popularBrgy.key })}
              >
                <Chip on={applied.barangay === popularBrgy.key}>
                  {popularBrgy.label}{' '}
                  <span className="font-mono text-[10.5px] text-ink45">{popularBrgy.n}</span>
                </Chip>
              </button>
            ) : null}
          </div>
        </div>

        {/* facets + results */}
        <div className="grid gap-8 mt-6 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            aria-label="Filters"
            className="border-line max-md:border-b max-md:pb-2 md:border-r md:pr-[26px]"
          >
            <FacetGroup title="Category" onClear={() => push({ category: null })}>
              {initial.facets.categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => push({ category: applied.category === c.key ? null : c.key })}
                  className={facetBtn(applied.category === c.key)}
                >
                  <span>{c.label}</span>
                  <span className="font-mono text-[10.5px] text-ink45">{c.n}</span>
                </button>
              ))}
            </FacetGroup>
            <FacetGroup title="Condition" onClear={() => push({ condition: null })}>
              {initial.facets.conditions.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => push({ condition: applied.condition === c.key ? null : c.key })}
                  className={facetBtn(applied.condition === c.key)}
                >
                  <span>{c.label}</span>
                  <span className="font-mono text-[10.5px] text-ink45">{c.n}</span>
                </button>
              ))}
            </FacetGroup>
            <FacetGroup title="Barangay" onClear={() => push({ barangay: null })}>
              {initial.facets.barangays.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => push({ barangay: applied.barangay === b.key ? null : b.key })}
                  className={facetBtn(applied.barangay === b.key)}
                >
                  <span>{b.label}</span>
                  <span className="font-mono text-[10.5px] text-ink45">{b.n}</span>
                </button>
              ))}
            </FacetGroup>
            <FacetGroup title="Status">
              <button
                type="button"
                onClick={() => push({ exchanged: applied.includeExchanged ? null : '1' })}
                className={facetBtn(applied.includeExchanged)}
              >
                <span>Show exchanged too</span>
                <span className="font-mono text-[10.5px] text-ink45">{initial.facets.exchanged}</span>
              </button>
            </FacetGroup>
            <div className="border border-line rounded-md bg-paper2 p-6 mt-4">
              <div className="t-label mb-2">Trading tip</div>
              <p className="t-small">
                Ask for a photo of the item switched on before you agree to meet. It saves both of
                you a trip.
              </p>
            </div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-line mb-6">
              <span className="t-small">
                Showing <b className="text-ink font-semibold">{initial.items.length}</b> of{' '}
                {initial.total} items <span className="text-ink45">· newest first</span>
              </span>
              <div className="flex items-center gap-3">
                <select
                  aria-label="Sort by"
                  value={applied.sort}
                  onChange={(e) =>
                    push({ sort: e.target.value === 'newest' ? null : e.target.value }, { scroll: false })
                  }
                  className="min-h-[40px] px-3 py-2 bg-surface border border-linestrong rounded-sm text-sm text-ink appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235c554b%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10 max-w-[190px]"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <div className="flex border border-linestrong rounded-sm overflow-hidden" role="group" aria-label="Layout">
                  <span className="w-10 h-[38px] inline-flex items-center justify-center bg-ink text-paper" aria-label="Grid view">
                    <Icon name="grid" size={16} />
                  </span>
                  <span className="w-10 h-[38px] inline-flex items-center justify-center text-ink45" aria-label="List view">
                    <Icon name="list" size={16} />
                  </span>
                </div>
              </div>
            </div>

            {initial.items.length ? (
              <>
                <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
                  {initial.items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
                <Pagination
                  page={initial.page}
                  total={initial.pageCount}
                  onSelect={(p) => push({ page: p > 1 ? String(p) : null }, { scroll: true })}
                />
                <div className="t-meta text-center mt-3">
                  Page {initial.page} of {initial.pageCount} · {initial.pageSize} items per page
                </div>
              </>
            ) : (
              <div className="text-center py-16 px-6 border border-dashed border-linestrong rounded-md bg-surface">
                <div className="w-[88px] h-[88px] mx-auto mb-5 rounded-full bg-paper2 flex items-center justify-center text-ink45">
                  <Icon name="search" size={30} />
                </div>
                <div className="font-display text-xl uppercase mb-2">
                  No items match those filters
                </div>
                <p className="t-small max-w-[560px] mx-auto">
                  Try removing the barangay filter first — most trades happen inside one barangay,
                  but neighbours one barangay over are usually happy to meet halfway.
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="secondary" size="sm" onClick={clearAll}>
                    Clear all filters
                  </Button>
                </div>
              </div>
            )}

            {/* saved-search prompt */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border border-dashed border-linestrong rounded-sm text-sm text-ink70 mt-8">
              <Icon name="bell" size={18} className="flex-none" />
              <span className="flex-1 min-w-0">
                Want to know the moment a neighbour posts a <b className="font-medium text-ink">rice cooker</b>{' '}
                in <b className="font-medium text-ink">San Andres</b>? Save items to your wishlist
                and turn on offer notifications.
              </span>
              <ButtonLink href="/sign-up" variant="secondary" size="sm">
                Create an account
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>

      {/* more-filters bottom sheet */}
      {sheet ? (
        <div className="fixed inset-0 bg-[rgba(22,19,15,.48)] flex items-end justify-center p-6 z-[60] overflow-y-auto">
          <div className="bg-surface rounded-t-lg w-full max-w-[520px] shadow-pop overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
            <div className="flex gap-3.5 items-start px-[22px] pt-5">
              <span className="w-[42px] h-[42px] rounded-full bg-accenttint text-accent flex items-center justify-center flex-none">
                <Icon name="filter" size={18} />
              </span>
              <div className="flex-1">
                <div className="t-h3" id="sheet-title">
                  More filters
                </div>
                <p className="t-small mt-1">Narrow by condition and how recently the item was posted.</p>
              </div>
              <button type="button" onClick={() => setSheet(false)} aria-label="Close" className="w-10 h-10 rounded-full inline-flex items-center justify-center hover:bg-paper2">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="px-[22px] pt-3.5 pb-5">
              <div className="mb-5">
                <span className="font-mono text-[12.5px] tracking-[0.02em] block mb-2">Condition</span>
                <div className="flex flex-wrap gap-2.5">
                  {initial.facets.conditions.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => push({ condition: applied.condition === c.key ? null : c.key })}
                    >
                      <Chip on={applied.condition === c.key}>{c.label}</Chip>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-5 last:mb-0">
                <span className="font-mono text-[12.5px] tracking-[0.02em] block mb-2">Posted</span>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
                  {[
                    { label: 'Last 24 hours', value: 'day' },
                    { label: 'Last 7 days', value: 'week' },
                    { label: 'Any time', value: '' },
                  ].map((o) => {
                    const on = (applied.since ?? '') === o.value
                    return (
                      <button
                        key={o.label}
                        type="button"
                        onClick={() => push({ since: o.value || null })}
                        className={`border rounded-sm px-3.5 py-3.5 text-sm flex items-center gap-2.5 bg-surface text-left ${on ? 'border-ink bg-paper2' : 'border-linestrong'}`}
                      >
                        <span className={`w-5 h-5 rounded-full border flex-none ${on ? 'border-[5px] border-ink bg-surface' : 'border-linestrong'}`} />
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 px-[22px] py-4 bg-paper border-t border-line">
              <Button variant="ghost" onClick={() => setSheet(false)}>
                Cancel
              </Button>
              <Button onClick={() => setSheet(false)}>Show results</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
