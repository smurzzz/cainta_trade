import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Terms & Privacy — CaintaTrade',
}

const TOC = [
  ['#terms', 'Terms of Use'],
  ['#who', '1 · Who may use CaintaTrade'],
  ['#rules', '2 · Community rules'],
  ['#prohibited', '3 · Prohibited items'],
  ['#trade', '4 · Trades and no-payment rule'],
  ['#accounts', '5 · Accounts and suspension'],
  ['#liability', '6 · Limitation of liability'],
  ['#privacy', 'Data Privacy Notice'],
  ['#collect', '7 · What we collect'],
  ['#rights', '8 · Your rights as a data subject'],
  ['#contact', '9 · Data Protection Officer'],
]

const PRIVACY_ROWS = [
  [
    'Full name, email, mobile number',
    'To create your account, sign you in, and send notifications about offers and messages.',
    'While your account is active',
  ],
  [
    'Barangay, street and address',
    'To keep trades local and to show a general area on your listings. Your exact address is never shown publicly.',
    'While your account is active',
  ],
  [
    'Proof of residency',
    'To confirm you live in Cainta before your account is approved. Only administrators can view it.',
    '90 days after approval, then deleted',
  ],
  [
    'Listing photos and descriptions',
    'To publish and moderate your listings.',
    'Until you delete the listing, plus 12 months of history',
  ],
  [
    'Messages and offer records',
    'To keep a record of a trade in case of a dispute or a report.',
    '24 months from the last message',
  ],
]

const RIGHTS: [string, string][] = [
  ['Right to be informed', 'to know what we collect and why, as set out above.'],
  ['Right to access', 'to request a copy of the personal data we hold about you.'],
  ['Right to correction', 'to have inaccurate information corrected.'],
  ['Right to erasure or blocking', 'to ask us to delete or stop processing your data, subject to legal retention rules.'],
  ['Right to object', 'to object to processing, including for direct marketing or profiling.'],
  ['Right to data portability', 'to receive your data in a commonly used electronic format.'],
  ['Right to file a complaint', 'with the National Privacy Commission, or to seek damages for a violation of your rights.'],
  ['Right to damages', 'to be indemnified for any damages sustained due to inaccurate, incomplete or unlawfully obtained data.'],
]

const PROHIBITED = [
  'Weapons, ammunition, explosives and pyrotechnics.',
  'Drugs, vapes, alcohol and prescription medicine.',
  'Live animals, meat, and unsealed food or medicine.',
  'Stolen, counterfeit or recalled goods.',
  'Government documents, IDs, bank cards and SIM cards.',
  'Unsafe electrical appliances with exposed wiring or a removed ground.',
  'Anything that is illegal to possess under Philippine law.',
]

export default function LegalPage() {
  return (
    <>
      {/* header band */}
      <section className="bg-paper2 border-b border-line py-11">
        <div className="wrap">
          <div className="eyebrow">
            <span className="t-label-accent">Legal</span>
          </div>
          <h1 className="t-h1">Terms of Use &amp; Data Privacy Notice</h1>
          <p className="t-lead mt-5 max-w-[680px]">
            These are the rules of the trading floor and the plain-language explanation of how we
            handle your personal information under the Philippine Data Privacy Act of 2012
            (Republic Act No. 10173).
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Badge>Effective 1 October 2026</Badge>
            <Badge>Version 2.1</Badge>
            <Badge variant="accent">RA 10173</Badge>
          </div>
        </div>
      </section>

      <div className="wrap py-11">
        <div className="grid gap-10 md:grid-cols-[280px_minmax(0,1fr)]">
          {/* TOC */}
          <aside className="border-line max-md:border-b max-md:pb-6 md:border-l md:pl-[18px]">
            <div className="md:sticky md:top-[88px]">
              <div className="t-label mb-3">On this page</div>
              {TOC.map(([href, label], i) => (
                <a
                  key={href}
                  href={href}
                  className={`block py-1.5 text-[14px] hover:text-accent ${
                    i === 0 || i === 7 ? 'text-ink font-medium' : 'text-ink70'
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>
          </aside>

          {/* content */}
          <div className="max-w-[820px] text-ink70 [&_h2]:t-h2 [&_h3]:font-display [&_h3]:text-[17px] [&_h3]:uppercase [&_h3]:text-ink [&_h3]:mb-2.5 [&_p]:text-[15px] [&_p]:mb-2.5 [&_li]:text-[15px] [&_li]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5">
            <div id="terms" className="mt-8 pt-8 border-t border-line first:mt-0 first:pt-0 first:border-t-0">
              <div className="t-label-accent mb-2">Part one</div>
              <h2 className="mb-4">Terms of Use</h2>
              <p>
                By creating an account or using CaintaTrade you agree to these terms. If you do not
                agree, please browse as a guest only. CaintaTrade is a community service for the
                residents of Cainta, Rizal, operated with the cooperation of the barangays.
              </p>
            </div>

            <div id="who" className="mt-8 pt-8 border-t border-line">
              <h3>1 · Who may use CaintaTrade</h3>
              <p>
                You may register only if you are <b className="text-ink font-semibold">at least 18
                years old</b> and you live within one of the seven barangays of Cainta: San Andres,
                San Isidro, San Juan, San Roque, Santa Rosa, Santo Domingo or Santo Niño. Accounts
                for people under 18 are not created, not approved, and are removed if they are
                found.
              </p>
              <p>
                Registration requires your full name, email address, mobile number, barangay,
                street or address, and one proof of residency. Accounts are reviewed before
                activation.
              </p>
            </div>

            <div id="rules" className="mt-8 pt-8 border-t border-line">
              <h3>2 · Community rules</h3>
              <ul>
                <li>Describe each item honestly, including damage, missing parts and defects.</li>
                <li>Use your own photographs of the actual item you are offering.</li>
                <li>
                  Answer offers and messages within a reasonable time, and cancel a trade you can no
                  longer keep.
                </li>
                <li>Do not post more than five active listings for the same item, or repost a removed listing.</li>
                <li>Do not harass, threaten or discriminate against another member.</li>
                <li>Do not impersonate another person or claim a barangay you do not live in.</li>
              </ul>
            </div>

            <div id="prohibited" className="mt-8 pt-8 border-t border-line">
              <h3>3 · Prohibited items</h3>
              <p>The following may never be listed, even for free, and will be removed immediately:</p>
              <ul>
                {PROHIBITED.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            <div id="trade" className="mt-8 pt-8 border-t border-line">
              <h3>4 · Trades and the no-payment rule</h3>
              <p>
                CaintaTrade is an item-for-item exchange. Money, deposits, shipping fees, delivery
                charges and “top-up” payments are not permitted, and asking for them is a violation
                of these terms. CaintaTrade does not take possession of any item, does not inspect
                items, and does not guarantee that a trade will be completed. Meeting arrangements
                are made between members, and both parties must confirm in the app before a trade
                is recorded as completed.
              </p>
            </div>

            <div id="accounts" className="mt-8 pt-8 border-t border-line">
              <h3>5 · Accounts, suspension and removal</h3>
              <p>
                An account may be suspended or removed if a member breaks these terms, is reported
                repeatedly, or provides false residency information. A suspended member is told the
                reason by email and may ask for a review by replying to that email within 30 days.
                You may delete your own account at any time in Settings; listings and open offers
                are closed with it.
              </p>
            </div>

            <div id="liability" className="mt-8 pt-8 border-t border-line">
              <h3>6 · Limitation of liability</h3>
              <p>
                CaintaTrade is provided as a community service “as is”. To the extent allowed by
                law, CaintaTrade and its barangay partners are not liable for the condition, safety
                or legality of any item traded, for the conduct of any member, or for any loss
                arising from a meetup. Please follow the safe trading guidelines.
              </p>
            </div>

            <div id="privacy" className="mt-8 pt-8 border-t border-line">
              <div className="t-label-accent mb-2">Part two</div>
              <h2 className="mb-4">Data Privacy Notice</h2>
              <p>
                This notice explains what personal information CaintaTrade collects and how it is
                used, in accordance with the Data Privacy Act of 2012 (RA 10173), its Implementing
                Rules and Regulations, and the issuances of the National Privacy Commission.
              </p>
            </div>

            <div id="collect" className="mt-8 pt-8 border-t border-line">
              <h3>7 · What we collect and why</h3>
              <div className="border border-line rounded-md bg-surface overflow-hidden mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-[14.5px]">
                    <thead>
                      <tr>
                        {['Information', 'Why we collect it', 'Kept for'].map((h) => (
                          <th
                            key={h}
                            className="text-left font-normal font-mono text-[11.5px] uppercase text-ink45 p-3 px-4 border-b border-linestrong bg-paper whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PRIVACY_ROWS.map(([info, why, kept]) => (
                        <tr key={info}>
                          <td className="p-3 px-4 border-b border-line font-medium text-ink align-top">{info}</td>
                          <td className="p-3 px-4 border-b border-line align-top">{why}</td>
                          <td className="p-3 px-4 border-b border-line align-top">{kept}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="mt-4">
                <b className="text-ink font-semibold">What we never do.</b> We do not sell your
                personal information, we do not share it with advertisers, and we do not use your
                address for marketing. Information is shared only with the barangay administrator
                who reviews residency, and with authorities when the law requires it.
              </p>
              <p>
                <b className="text-ink font-semibold">How we protect it.</b> Residency documents are
                stored in a private area that only administrators can open, transmitted over an
                encrypted connection, and deleted 90 days after approval. Passwords are stored only
                as salted hashes.
              </p>
              <p>
                <b className="text-ink font-semibold">Your choices.</b> You control whether your
                contact number is visible to other members, whether you receive email or push
                notifications, and whether your profile shows your completed-trade count.
              </p>
            </div>

            <div id="rights" className="mt-8 pt-8 border-t border-line">
              <h3>8 · Your rights as a data subject</h3>
              <ul>
                {RIGHTS.map(([right, rest]) => (
                  <li key={right}>
                    <b className="text-ink font-semibold">{right}</b> — {rest}
                  </li>
                ))}
              </ul>
              <p>
                Requests may be made from Settings › Privacy, or by email. We respond within 15
                working days, as required by the NPC.
              </p>
            </div>

            <div id="contact" className="mt-8 pt-8 border-t border-line">
              <h3>9 · Data Protection Officer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="border border-line rounded-md bg-surface p-6">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="t-label">Data Protection Officer</span>
                    <span className="inline-flex items-center gap-1.5 px-[9px] py-1 rounded-xs border border-[#ddc78f] bg-brasstint text-brass font-mono text-[11px] uppercase">
                      Placeholder
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-y-1 text-[14.5px]">
                    {[
                      ['Email', '[DPO email — placeholder, replace before launch]'],
                      ['Postal', '[DPO postal address — placeholder, replace before launch]'],
                      ['Response', 'Within 15 working days'],
                    ].map(([k, v]) => (
                      <div key={k} className="contents">
                        <span className="font-mono text-[11.5px] uppercase tracking-[0.02em] text-ink45 pt-1">
                          {k}
                        </span>
                        <span className="text-ink pb-2">{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="t-meta mt-3">
                    Both fields must be a real monitored mailbox and a real delivery address before
                    the first member signs up. CaintaTrade is an independent community project and
                    is not affiliated with the LGU; the DPO address must not be the Municipal Hall.
                  </p>
                </div>
                <div className="border border-line rounded-md bg-paper2 p-6">
                  <div className="t-label mb-3">National Privacy Commission</div>
                  <div className="grid grid-cols-1 gap-y-1 text-[14.5px]">
                    {[
                      ['Website', 'privacy.gov.ph'],
                      ['Complaints', 'complaints@privacy.gov.ph'],
                      ['Address', '3rd Floor, Philippine Standard Time Bldg., 5th Ave., BGC, Taguig'],
                    ].map(([k, v]) => (
                      <div key={k} className="contents">
                        <span className="font-mono text-[11.5px] uppercase tracking-[0.02em] text-ink45 pt-1">
                          {k}
                        </span>
                        <span className="text-ink pb-2">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-6">
                <ButtonLink href="/sign-up">I agree — create an account</ButtonLink>
                <ButtonLink href="/how-it-works" variant="secondary">
                  Read the safety guide
                </ButtonLink>
              </div>
              <p className="t-meta mt-4">
                This document is a design mockup of the legal pages. It is not legal advice and
                must be reviewed by counsel before publication.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
