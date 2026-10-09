import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ItemCard } from "@/components/ui/item-card";
import { SectionHead } from "@/components/ui/card";
import { TrustRow } from "@/components/ui/feedback";
import { imgUrl } from "@/lib/mock/images";
import { listItems } from "@/lib/queries/catalog";

/** Landing-page icon per seeded top-level category (docs/03 · 3.15 wiring). */
const CATEGORY_ICONS: Record<string, string> = {
  Furniture: "home",
  Appliances: "box",
  Kitchenware: "tools",
  Electronics: "camera",
  "Books & school": "tag",
  "Bicycles & parts": "swap",
  Clothing: "user",
  "Plants & garden": "sparkle",
};

const STEPS = [
  {
    n: "Step 01",
    title: "List what you have",
    body: "Take a few photos, describe the item honestly, and note what you would like in return.",
  },
  {
    n: "Step 02",
    title: "Find a fair swap",
    body: "Filter by category, condition and barangay so you only see items you can actually reach on foot or by tricycle.",
  },
  {
    n: "Step 03",
    title: "Propose the trade",
    body: "Offer one of your items with a short note and suggest a place and time to meet. Chat inside the platform until you both agree.",
  },
  {
    n: "Step 04",
    title: "Meet and confirm",
    body: "Meet in a public spot, inspect the item, then both tap “Exchange completed”. Leave a rating so the next neighbour knows who to trust.",
  },
];

const SAFETY_TIPS = [
  "Meet at the barangay hall, a covered court, or a mall activity area — never a private home for a first trade.",
  "Bring a companion for high-value items, and check appliances are working before you accept.",
  "Never send money, gift codes or personal documents — every trade here is item for item.",
];

const SPOTS = [
  ["Cainta Municipal Hall grounds", "San Andres · covered, guarded"],
  ["Barangay hall lobby", "Any of the 7 barangays"],
  ["Robinsons Cainta activity area", "San Andres · open till 9pm"],
  ["Sta. Lucia Mall activity area", "San Roque · meet near the main entrance"],
];

/** Statically rendered, but refreshed every minute so the live counts and
 *  featured listings never go stale between deploys (docs/03 3.15). */
export const revalidate = 60;

export default async function LandingPage() {
  // Real catalog: newest listings, live category/barangay facet counts, total.
  const catalog = await listItems({ pageSize: 4 });
  const FEATURED = catalog.items;
  const CATEGORIES = catalog.facets.categories.map((c) => ({
    icon: CATEGORY_ICONS[c.label] ?? "box",
    name: c.label,
    n: c.n,
  }));
  const BARANGAYS = catalog.facets.barangays.map((b) => [b.label, `${b.n} items`] as [string, string]);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="py-10 md:py-18">
        <div className="wrap">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px] items-center">
            <div>
              <div className="eyebrow">
                <span className="t-label-accent">Cainta, Rizal · 7 barangays</span>
              </div>
              <h1 className="t-hero">
                Trade what you have
                <br />
                for what your
                <br />
                neighbour needs
              </h1>
              <p className="t-lead mt-6 max-w-[560px]">
                List the things you no longer need. See what neighbours are offering. Propose a
                swap, meet up, and exchange. No cash, no delivery, no fees — ever.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-8">
                <ButtonLink href="/sign-up" size="lg">
                  Post an item
                </ButtonLink>
                <ButtonLink href="/browse" variant="secondary" size="lg">
                  Browse items nearby
                </ButtonLink>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 border-t border-linestrong pt-6">
                <TrustRow icon="swap">Items only. Never money.</TrustRow>
                <TrustRow icon="pin">Meet in public places</TrustRow>
                <TrustRow icon="shield">Verified residents only</TrustRow>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="relative">
                <div className="relative bg-[linear-gradient(135deg,#efe9df,#e5ded1)] overflow-hidden" style={{ aspectRatio: "21 / 9" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl("yellow-chair", 1200)} alt="Yellow accent armchair in a bright living room" className="w-full h-full object-cover" />
                </div>
                <Badge variant="accent" className="absolute left-3.5 top-3.5">
                  Trade of the week
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { img: "pendant-lamps", label: "Pendant lamps", meta: "Available · San Isidro", title: "Brass pendant lamp set", by: "Nestor is looking for a rice cooker" },
                  { img: "road-bike", label: "Road bike", meta: "Available · San Roque", title: "Road bike, 26er", by: "Danny is looking for a study desk" },
                ].map((tile) => (
                  <div key={tile.title} className="flex flex-col gap-3">
                    <div className="relative bg-[linear-gradient(135deg,#efe9df,#e5ded1)] overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl(tile.img, 600)} alt={tile.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="t-label">{tile.meta}</div>
                      <div className="text-base font-medium leading-[1.35] mt-1">{tile.title}</div>
                      <div className="t-meta">{tile.by}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4 border border-line rounded-xl p-4 bg-surface">
                <div>
                  <div className="t-num">1,284</div>
                  <div className="t-label mt-1">Items traded this year</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex">
                    {["/assets/avatar-1.svg", "/assets/avatar-2.svg", "/assets/avatar-3.svg"].map((a, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={a}
                        src={a}
                        alt=""
                        className={`w-[30px] h-[30px] rounded-full object-cover border-2 border-surface shadow-[0_0_0_1px_var(--color-line)] ${i ? "-ml-2.5" : ""}`}
                      />
                    ))}
                  </div>
                  <span className="t-meta">
                    +312 neighbours
                    <br />
                    joined this month
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ink strip ────────────────────────────────────────────────── */}
      <div className="bg-ink text-paper py-3.5">
        <div className="wrap flex flex-wrap gap-6 justify-between">
          <span className="text-[rgba(247,244,239,.72)] font-mono text-[11.5px] tracking-[0.12em] uppercase">No cash</span>
          <span className="text-[rgba(247,244,239,.72)] font-mono text-[11.5px] tracking-[0.12em] uppercase">No delivery</span>
          <span className="text-[rgba(247,244,239,.72)] font-mono text-[11.5px] tracking-[0.12em] uppercase">Barangay by barangay</span>
          <span className="text-[rgba(247,244,239,.72)] font-mono text-[11.5px] tracking-[0.12em] uppercase">Free for residents</span>
          <span className="text-accent font-mono text-[11.5px] tracking-[0.12em] uppercase">Cainta only</span>
          <span className="text-[rgba(247,244,239,.72)] font-mono text-[11.5px] tracking-[0.12em] uppercase">7 barangays</span>
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="py-10 md:py-18">
        <div className="wrap">
          <SectionHead
            label="How it works"
            title="Four steps, no money involved"
            aside={
              <Link href="/how-it-works" className="inline-flex items-center gap-2 font-mono text-[12.5px] hover:text-accent hover:gap-3 transition-all">
                Read the safety guide <Icon name="arrow" size={16} />
              </Link>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-7">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t border-linestrong pt-[18px]">
                <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-accent">{s.n}</div>
                <div className="font-display font-semibold uppercase tracking-[-0.01em] text-[17px] my-2.5 mb-2">{s.title}</div>
                <p className="t-small">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured ─────────────────────────────────────────────────── */}
      <section className="py-10 md:py-18 bg-paper2">
        <div className="wrap">
          <SectionHead
            label="New this week"
            title="Featured in your barangay"
            aside={
            <Link href="/browse" className="inline-flex items-center gap-2 font-mono text-[12.5px] hover:text-accent hover:gap-3 transition-all">
              Browse all {catalog.total} items <Icon name="arrow" size={16} />
            </Link>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {FEATURED.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────── */}
      <section className="py-10 md:py-18">
        <div className="wrap">
          <SectionHead label="Categories" title="What neighbours are trading" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((c) => (
              <Link
                key={c.name}
                href="/browse"
                className="flex items-center gap-3 p-4 border border-line rounded-md bg-surface text-sm hover:border-ink"
              >
                <span className="w-[38px] h-[38px] rounded-full bg-ink text-paper inline-flex items-center justify-center flex-none">
                  <Icon name={c.icon} size={18} />
                </span>
                <span>
                  <b className="font-semibold">{c.name}</b>
                  <br />
                  <span className="t-meta">{c.n} items</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Coverage ─────────────────────────────────────────────────── */}
      <section className="py-10 md:py-18 bg-paper2" id="coverage">
        <div className="wrap">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="eyebrow">
                <span className="t-label-accent">Coverage</span>
              </div>
              <h2 className="t-h2">Seven barangays, one trading floor</h2>
              <p className="t-body mt-4 max-w-[680px]">
                CaintaTrade covers the whole municipality and nothing beyond it. Barangay is part
                of every listing, so you always know whether a trade is a short walk away or a
                tricycle ride.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {BARANGAYS.map(([name, n]) => (
                  <div key={name} className="border border-line rounded-md bg-surface p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span>{name}</span>
                      <span className="t-label">{n}</span>
                    </div>
                  </div>
                ))}
                <div className="border border-[#e8cfc6] rounded-md bg-accenttint p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span>Your barangay</span>
                    <span className="t-label-accent">Set after sign-up</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative bg-[linear-gradient(135deg,#efe9df,#e5ded1)] overflow-hidden" style={{ aspectRatio: "4 / 5" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl("sectional", 800)} alt="Living room in a Cainta home" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Safety (ink) ─────────────────────────────────────────────── */}
      <section className="py-10 md:py-18 bg-ink text-paper" id="safety">
        <div className="wrap">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px] items-center">
            <div>
              <div className="text-[rgba(247,244,239,.6)] font-mono text-[11.5px] tracking-[0.12em] uppercase mb-3">
                Safe trading
              </div>
              <h2 className="t-h1">Trading with neighbours should feel safe</h2>
              <p className="t-lead mt-5 max-w-[560px] text-[rgba(247,244,239,.72)]">
                Meet in daylight at public places, inspect the item before you hand anything over,
                and keep the conversation inside CaintaTrade so there is a record if something goes
                wrong.
              </p>
              <div className="flex flex-col gap-4 mt-8">
                {SAFETY_TIPS.map((tip) => (
                  <div key={tip} className="flex items-start gap-3">
                    <Badge variant="accent">Tip</Badge>
                    <span className="text-[15px] leading-[1.55] text-[rgba(247,244,239,.8)]">{tip}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-8">
                <ButtonLink href="/how-it-works" variant="light">
                  Read the full guide
                </ButtonLink>
                <ButtonLink href="/how-it-works#meetup" variant="outlineLight">
                  See meetup spots in Cainta
                </ButtonLink>
              </div>
            </div>
            <div className="border border-[rgba(247,244,239,.18)] rounded-md p-6 bg-[rgba(247,244,239,.07)]">
              <div className="text-[rgba(247,244,239,.6)] font-mono text-[11.5px] tracking-[0.12em] uppercase mb-4">
                Suggested meetup spots
              </div>
              <div className="flex flex-col">
                {SPOTS.map(([name, meta], i) => (
                  <div key={name} className="flex items-center gap-3.5 py-3.5 border-b border-[rgba(247,244,239,.14)] last:border-b-0">
                    <span className="font-mono text-[11px] text-[rgba(247,244,239,.45)] w-[26px] flex-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="text-paper">{name}</div>
                      <div className="text-sm text-[rgba(247,244,239,.5)]">{meta}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[15px] leading-[1.55] mt-4 text-[rgba(247,244,239,.55)]">
                Public places anyone may use. CaintaTrade is an independent community project, not
                affiliated with the Cainta municipal government (LGU).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-10 md:py-18">
        <div className="wrap text-center">
          <div className="eyebrow justify-center">
            <span className="t-label-accent">Join CaintaTrade</span>
          </div>
          <h2 className="t-hero max-w-[820px] mx-auto">
            Your spare rice cooker is somebody&apos;s missing kitchen
          </h2>
          <p className="t-lead mt-6 max-w-[560px] mx-auto">
            Registration is free and takes about two minutes. Bring one proof of residency and you
            can start listing today.
          </p>
          <div className="flex flex-wrap gap-3 mt-8 justify-center">
            <ButtonLink href="/sign-up" size="lg">
              Create your account
            </ButtonLink>
            <ButtonLink href="/browse" variant="secondary" size="lg">
              Browse first
            </ButtonLink>
          </div>
          <div className="flex flex-wrap gap-6 mt-8 justify-center">
            <span className="t-meta">Free forever</span>
            <span className="t-meta">Residents of Cainta only</span>
            <span className="t-meta">Reviewed within 24 hours</span>
          </div>
        </div>
      </section>
    </>
  );
}
