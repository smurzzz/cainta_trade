'use client'

import { useMemo, useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { ItemCard } from '@/components/ui/item-card'
import { Pagination } from '@/components/ui/pagination'
import { Chip } from '@/components/ui/badge'
import {
  BARANGAY_FACETS,
  CATEGORY_FACETS,
  CONDITION_FACETS,
  ITEMS,
  toCard,
} from '@/lib/mock/data'

const CONDITIONS = ['Like new', 'Good', 'Fair', 'For repair']

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

/** Browse screen (mockup a2): filter bar, facet sidebar, results grid. */
export function BrowseScreen() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const [brgy, setBrgy] = useState<string | null>(null)
  const [condition, setCondition] = useState<string | null>(null)
  const [showExchanged, setShowExchanged] = useState(false)
  const [sheet, setSheet] = useState(false)

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return ITEMS.filter((i) => {
      if (!showExchanged && i.status === 'Exchanged') return false
      if (cat && i.catKey !== cat) return false
      if (brgy && i.brgyKey !== brgy) return false
      if (condition && i.condition !== condition) return false
      if (needle) {
        const hay = `${i.title} ${i.category} ${i.barangay} ${i.description}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [q, cat, brgy, condition, showExchanged])

  const clearAll = () => {
    setQ('')
    setCat(null)
    setBrgy(null)
    setCondition(null)
    setShowExchanged(false)
  }

  const facetBtn = (active: boolean) =>
    `flex items-center justify-between gap-2 py-1.5 text-[14.5px] w-full text-left ${
      active ? 'text-ink font-medium' : 'text-ink70 hover:text-ink'
    }`

  return (
    <>
      {/* header band */}
      <section className="bg-paper2 border-b border-line py-9">
        <div className="wrap">
          <div className="eyebrow">
            <span className="t-label-accent">128 items across 7 barangays</span>
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
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
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
              value={cat ?? ''}
              onChange={(e) => setCat(e.target.value || null)}
              className="min-h-[48px] px-3.5 py-3 bg-surface border border-linestrong rounded-sm text-[15.5px] text-ink appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235c554b%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10 max-w-[190px]"
            >
              <option value="">All categories</option>
              {CATEGORY_FACETS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Condition"
              value={condition ?? ''}
              onChange={(e) => setCondition(e.target.value || null)}
              className="min-h-[48px] px-3.5 py-3 bg-surface border border-linestrong rounded-sm text-[15.5px] text-ink appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235c554b%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10 max-w-[170px]"
            >
              <option value="">Any condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              aria-label="Barangay"
              value={brgy ?? ''}
              onChange={(e) => setBrgy(e.target.value || null)}
              className="min-h-[48px] px-3.5 py-3 bg-surface border border-linestrong rounded-sm text-[15.5px] text-ink appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235c554b%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10 max-w-[180px]"
            >
              <option value="">All barangays</option>
              {BARANGAY_FACETS.map((b) => (
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
            <button type="button" onClick={() => setCat(cat === 'furniture' ? null : 'furniture')}>
              <Chip on={cat === 'furniture'}>
                Furniture <span className="font-mono text-[10.5px] text-ink45">21</span>
              </Chip>
            </button>
            <button type="button" onClick={() => setCat(cat === 'kitchenware' ? null : 'kitchenware')}>
              <Chip on={cat === 'kitchenware'}>
                Kitchenware <span className="font-mono text-[10.5px] text-ink45">14</span>
              </Chip>
            </button>
            <button type="button" onClick={() => setCat(cat === 'bicycles' ? null : 'bicycles')}>
              <Chip on={cat === 'bicycles'}>
                Bicycles <span className="font-mono text-[10.5px] text-ink45">7</span>
              </Chip>
            </button>
            <button type="button" onClick={() => setBrgy(brgy === 'san-andres' ? null : 'san-andres')}>
              <Chip on={brgy === 'san-andres'}>
                San Andres <span className="font-mono text-[10.5px] text-ink45">34</span>
              </Chip>
            </button>
          </div>
        </div>

        {/* facets + results */}
        <div className="grid gap-8 mt-6 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            aria-label="Filters"
            className="border-line max-md:border-b max-md:pb-2 md:border-r md:pr-[26px]"
          >
            <FacetGroup title="Category" onClear={() => setCat(null)}>
              {CATEGORY_FACETS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCat(cat === c.key ? null : c.key)}
                  className={facetBtn(cat === c.key)}
                >
                  <span>{c.label}</span>
                  <span className="font-mono text-[10.5px] text-ink45">{c.n}</span>
                </button>
              ))}
            </FacetGroup>
            <FacetGroup title="Condition" onClear={() => setCondition(null)}>
              {CONDITION_FACETS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCondition(condition === c.label ? null : c.label)}
                  className={facetBtn(condition === c.label)}
                >
                  <span>{c.label}</span>
                  <span className="font-mono text-[10.5px] text-ink45">{c.n}</span>
                </button>
              ))}
            </FacetGroup>
            <FacetGroup title="Barangay" onClear={() => setBrgy(null)}>
              {BARANGAY_FACETS.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setBrgy(brgy === b.key ? null : b.key)}
                  className={facetBtn(brgy === b.key)}
                >
                  <span>{b.label}</span>
                  <span className="font-mono text-[10.5px] text-ink45">{b.n}</span>
                </button>
              ))}
            </FacetGroup>
            <FacetGroup title="Status">
              <button
                type="button"
                onClick={() => setShowExchanged(!showExchanged)}
                className={facetBtn(showExchanged)}
              >
                <span>Show exchanged too</span>
                <span className="font-mono text-[10.5px] text-ink45">84</span>
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
                Showing <b className="text-ink font-semibold">{results.length}</b> of 128 items{' '}
                <span className="text-ink45">· newest first</span>
              </span>
              <div className="flex items-center gap-3">
                <select
                  aria-label="Sort by"
                  className="min-h-[40px] px-3 py-2 bg-surface border border-linestrong rounded-sm text-sm text-ink appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235c554b%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10 max-w-[190px]"
                >
                  <option>Newest first</option>
                  <option>Nearest barangay</option>
                  <option>Recently updated</option>
                  <option>Most relevant</option>
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

            {results.length ? (
              <>
                <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
                  {results.map((item) => (
                    <ItemCard key={item.id} item={toCard(item)} />
                  ))}
                </div>
                <Pagination page={1} total={3} />
                <div className="t-meta text-center mt-3">Page 1 of 11 · 12 items per page</div>
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
                Want alerts when a neighbour posts a <b className="font-medium text-ink">rice cooker</b>{' '}
                in <b className="font-medium text-ink">San Andres</b>? Saved searches are available
                to signed-in members.
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
                <p className="t-small mt-1">Narrow by condition, status and distance from your barangay.</p>
              </div>
              <button type="button" onClick={() => setSheet(false)} aria-label="Close" className="w-10 h-10 rounded-full inline-flex items-center justify-center hover:bg-paper2">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="px-[22px] pt-3.5 pb-5">
              <div className="mb-5">
                <span className="font-mono text-[12.5px] tracking-[0.02em] block mb-2">Condition</span>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map((c) => (
                    <button key={c} type="button" onClick={() => setCondition(condition === c ? null : c)}>
                      <Chip on={condition === c}>{c}</Chip>
                    </button>
                  ))}
                </div>
              </div>
              {[
                { label: 'Distance', opts: ['Same barangay', 'Adjacent barangay', 'Anywhere in Cainta'], on: 2 },
                { label: 'Posted', opts: ['Last 24 hours', 'Last 7 days', 'Any time'], on: 1 },
              ].map((group) => (
                <div key={group.label} className="mb-5 last:mb-0">
                  <span className="font-mono text-[12.5px] tracking-[0.02em] block mb-2">{group.label}</span>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
                    {group.opts.map((o, i) => (
                      <span
                        key={o}
                        className={`border rounded-sm px-3.5 py-3.5 text-sm flex items-center gap-2.5 bg-surface ${
                          i === group.on ? 'border-ink bg-paper2' : 'border-linestrong'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full border flex-none ${i === group.on ? 'border-[5px] border-ink bg-surface' : 'border-linestrong'}`} />
                        {o}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
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
