import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { QA } from '@/components/ui/qa'

export const metadata: Metadata = {
  title: 'How it works — CaintaTrade',
}

const STEPS = [
  {
    n: 'Step 01',
    title: 'List what you have',
    body: 'Snap three or four clear photos in daylight, name the item, pick a category and be honest about condition. Add what you would like in return — “looking for a rice cooker” is enough.',
  },
  {
    n: 'Step 02',
    title: 'Find a fair swap',
    body: 'Browse by category or search by name, then filter to your barangay so you only see items you can carry home. Save anything interesting to your wishlist.',
  },
  {
    n: 'Step 03',
    title: 'Propose the trade',
    body: 'Offer one of your own items, add an optional note, and suggest a place and time. When your offer is accepted, chat inside CaintaTrade until you both agree on the details.',
  },
  {
    n: 'Step 04',
    title: 'Meet and confirm',
    body: 'Meet in a public place, inspect the item, and both tap “Exchange completed”. Then leave a rating so the next neighbour knows who to trust.',
  },
]

const TIPS = [
  { icon: 'pin', title: 'Meet in public, in daylight', body: 'Barangay halls, the Municipal Hall grounds, covered courts, or a mall activity area. For a first trade, never a private home.' },
  { icon: 'eye', title: 'Inspect before you hand over', body: 'Plug in appliances, test moving parts, and check for damage you cannot see in a photo. You are allowed to walk away.' },
  { icon: 'users', title: 'Bring someone along', body: 'For a high-value item, bring a companion — the same goes if you are the one giving something away.' },
  { icon: 'chat', title: 'Keep it on the platform', body: 'Chats stay attached to the offer, so there is a record if something goes wrong. Move off-platform and we cannot help.' },
  { icon: 'alert', title: 'Never send money', body: 'There are no fees, deposits, shipping charges or “reservation payments”. Anyone asking for cash is breaking the rules.' },
  { icon: 'shield', title: 'Share only what is needed', body: 'Your exact address, ID numbers and bank details never belong in a chat. Give your barangay and a public meetup point instead.' },
]

const SPOTS = [
  { name: 'Cainta Municipal Hall grounds', meta: 'San Andres · guarded, covered waiting area, jeepney terminal beside it', badge: 'Most used' },
  { name: 'Barangay hall lobby', meta: 'Any of the 7 barangays · best for nearby trades, ask for the barangay tanod' },
  { name: 'Robinsons Cainta activity area', meta: 'San Andres · air-conditioned, open until 9pm, meet near the ground-floor entrance' },
  { name: 'Sta. Lucia Mall activity area', meta: 'San Roque · meet at the main entrance, security guard on duty' },
  { name: 'Cainta Public Market entrance', meta: 'San Andres · busy in the morning, best between 7am and 11am' },
  { name: 'Covered court, Karangalan Village', meta: 'San Isidro · good for bulky furniture, plenty of space to load' },
  { name: 'Cainta Police Station lobby', meta: 'San Andres · for high-value trades if either side feels uneasy', badge: 'High value' },
]

const BARANGAY_PANELS = [
  ['San Andres', 'Poblacion · 34 items'],
  ['San Isidro', '21 items'],
  ['San Juan', '18 items'],
  ['San Roque', '16 items'],
  ['Santa Rosa', '14 items'],
  ['Santo Domingo', '13 items'],
  ['Santo Niño', '12 items'],
]

const FAQ = [
  { q: 'Is CaintaTrade really free?', a: 'Yes. There are no fees, no commissions and no premium tiers. Because nothing is sold, there is nothing to charge for.' },
  { q: 'Can I sell an item for cash instead?', a: 'No. CaintaTrade is item-for-item only. Listings that ask for money are removed by moderators, and repeat attempts suspend the account.' },
  { q: 'Do you deliver the item to me?', a: 'There is no delivery service. You and your neighbour agree on a meetup place and time inside the chat, then carry the item yourselves.' },
  { q: 'Why does my account need approval?', a: 'To keep the community local and real, every new member uploads one proof of residency — a barangay ID, a utility bill, or a certificate of residency. An administrator checks it within 24 hours.' },
  { q: 'What if the item is not as described?', a: 'Inspect before you accept, and cancel the trade in the app if it does not match. Then report the listing — repeated misdescription leads to suspension.' },
  { q: 'Can I trade outside Cainta?', a: 'Not at the moment. Coverage is limited to the seven barangays of Cainta so that neighbours stay within reach of each other.' },
  { q: 'How does Following a member work?', a: 'Open any profile and press Follow. You get an in-app notice and an email when they post a new listing — they are never told who follows them, and you can unfollow from your Following list at any time.' },
  { q: 'Can I take a break without deleting my account?', a: 'Yes. Pause your account for 30 days from Settings: your listings and offers are hidden, messages are kept, and signing in resumes everything. Nothing is deleted while paused.' },
  { q: 'Do I need a code to log in?', a: 'You log in with your email or mobile number. If you switch on two-factor authentication in Settings, each sign-in from a new device also needs a 6-digit code sent by SMS or shown in your authenticator app.' },
]

export default function GuidePage() {
  return (
    <>
      {/* hero */}
      <section className="py-10 md:py-18">
        <div className="wrap">
          <div className="eyebrow">
            <span className="t-label-accent">About CaintaTrade</span>
          </div>
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px] items-center">
            <div>
              <h1 className="t-hero">How CaintaTrade works</h1>
              <p className="t-lead mt-6 max-w-[560px]">
                A free trading floor for the seven barangays of Cainta. You offer something you no
                longer need, a neighbour offers something you do, and you swap — no money changes
                hands, and nothing is delivered.
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/meetup.svg"
              alt="Illustration of neighbours meeting in a public place"
              className="border border-line rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-7 mt-10">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t border-linestrong pt-[18px]">
                <div className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-accent">{s.n}</div>
                <div className="font-display font-semibold uppercase tracking-[-0.01em] text-[17px] my-2.5 mb-2">
                  {s.title}
                </div>
                <p className="t-small">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* safety */}
      <section className="py-10 md:py-18 bg-paper2" id="safety">
        <div className="wrap">
          <div className="eyebrow">
            <span className="t-label-accent">Safe trading guidelines</span>
          </div>
          <h2 className="t-h2">Six habits that keep a trade safe</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[22px] mt-8">
            {TIPS.map((t) => (
              <div key={t.title} className="border border-line rounded-md p-5 bg-surface">
                <div className="w-[38px] h-[38px] rounded-full bg-paper2 flex items-center justify-center mb-3.5">
                  <Icon name={t.icon} size={18} />
                </div>
                <div className="t-h3">{t.title}</div>
                <p className="t-small mt-2">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* meetup spots */}
      <section className="py-10 md:py-18" id="meetup">
        <div className="wrap">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="eyebrow">
                <span className="t-label-accent">Meetup spots</span>
              </div>
              <h2 className="t-h2">Suggested safe places to meet in Cainta</h2>
              <p className="t-body mt-4 max-w-[680px]">
                These are public, well-lit and easy to reach from every barangay. Use the
                “suggested meetup place” field when you send an offer so both sides know where to
                go.
              </p>
              <div className="border border-line rounded-md bg-surface p-6 mt-6">
                <div className="flex flex-col">
                  {SPOTS.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3.5 py-3.5 border-b border-line last:border-b-0">
                      <span className="font-mono text-[11px] text-ink45 w-[26px] flex-none">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="t-h3">{s.name}</div>
                        <div className="t-meta mt-1">{s.meta}</div>
                      </div>
                      {s.badge ? (
                        <span className="inline-flex items-center gap-1.5 px-[9px] py-1 rounded-xs border border-[#c3d1bb] bg-olivetint text-olive font-mono text-[11px] uppercase whitespace-nowrap">
                          {s.badge}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className="t-small mt-3.5 pt-3.5 border-t border-line">
                  These are ordinary public places that anyone may use. CaintaTrade is an
                  independent community project and is not affiliated with the Cainta municipal
                  government (LGU).
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="border border-[#e8cfc6] rounded-md bg-accenttint p-6">
                <div className="t-label-accent mb-2">Do</div>
                <div className="flex flex-col gap-2 t-small">
                  <span>Tell a family member where you are meeting.</span>
                  <span>Agree the swap in chat before you meet.</span>
                  <span>Take a photo of the item at the meetup.</span>
                  <span>Confirm the exchange in the app.</span>
                </div>
              </div>
              <div className="border border-line rounded-md bg-surface p-6">
                <div className="t-label mb-2">Don&apos;t</div>
                <div className="flex flex-col gap-2 t-small">
                  <span>Do not accept cash “top-ups” for a better item.</span>
                  <span>Do not send a deposit to hold an item.</span>
                  <span>Do not meet at night or in an empty lot.</span>
                  <span>Do not share ID numbers or bank details.</span>
                </div>
              </div>
              <div className="flex gap-3 items-start border border-[#e2b9b2] border-l-[3px] border-l-danger bg-dangertint rounded-sm px-4 py-3.5">
                <Icon name="alert" size={18} className="mt-0.5 flex-none" />
                <div>
                  <div className="font-medium">Something felt wrong?</div>
                  <p className="t-small mt-1">
                    Use the report button on any listing or profile. Reports go straight to an
                    administrator and you can stay anonymous.
                  </p>
                  <ButtonLink href="/report" variant="secondary" size="sm" className="mt-3">
                    Report an item or member
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* coverage */}
      <section className="py-10 md:py-18 bg-paper2" id="coverage">
        <div className="wrap">
          <div className="eyebrow">
            <span className="t-label-accent">Barangay coverage</span>
          </div>
          <h2 className="t-h2">Where CaintaTrade operates</h2>
          <p className="t-body mt-4 max-w-[680px]">
            CaintaTrade is limited to the municipality of Cainta, Rizal. When you register you pick
            one of the seven barangays, and that becomes the default area for browsing and posting.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {BARANGAY_PANELS.map(([name, meta]) => (
              <div key={name} className="border border-line rounded-md bg-surface p-6">
                <div className="t-h3">{name}</div>
                <div className="t-meta mt-1">{meta}</div>
              </div>
            ))}
            <div className="border border-[#e8cfc6] rounded-md bg-accenttint p-6">
              <div className="t-h3">Outside Cainta?</div>
              <div className="t-meta mt-1">Not covered — this keeps trades local</div>
            </div>
          </div>
        </div>
      </section>

      {/* faq */}
      <section className="py-10 md:py-18" id="faq">
        <div className="wrap">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px]">
            <div className="max-w-[820px]">
              <div className="eyebrow">
                <span className="t-label-accent">Common questions</span>
              </div>
              <h2 className="t-h2">Questions neighbours ask before their first trade</h2>
              <QA items={FAQ} />
            </div>
            <div className="flex flex-col gap-4">
              <div className="border border-line rounded-md bg-surface p-6">
                <div className="t-label mb-3">Still stuck?</div>
                <div className="grid grid-cols-1 gap-y-1 gap-x-5 text-[14.5px]">
                  {[
                    ['Email', 'help@caintatrade.ph'],
                    ['Community desk', 'Cainta Municipal Hall, Mon–Fri'],
                    ['Reply time', 'Within one working day'],
                  ].map(([k, v]) => (
                    <div key={k} className="contents">
                      <span className="font-mono text-[11.5px] tracking-[0.02em] uppercase text-ink45 pt-1">
                        {k}
                      </span>
                      <span className="text-ink pb-2">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="t-small mt-3">
                  The community desk is a public LGU facility. CaintaTrade is an independent
                  community project, not affiliated with the municipal government — desk staff can
                  help with directions and registration, but only administrators here can act on
                  trade disputes.
                </p>
                <ButtonLink href="/sign-up" block className="mt-5">
                  Create your account
                </ButtonLink>
                <ButtonLink href="/browse" variant="secondary" block className="mt-2">
                  Browse items
                </ButtonLink>
              </div>
              <div className="border border-line rounded-md bg-paper2 p-6">
                <div className="t-label mb-2">House rules in one line</div>
                <p className="t-small">
                  Be honest about what you are giving, be on time where you said you would be, and
                  answer messages — most trades that fail, fail on silence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
