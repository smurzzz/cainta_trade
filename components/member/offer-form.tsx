'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Notice } from '@/components/ui/feedback'
import { Icon } from '@/components/ui/icon'
import { useToast } from '@/components/ui/toast'
import { createOffer } from '@/actions/trading'

type MyItem = { id: string; title: string; status: string; photo: string | null }
type Spot = { id: string; name: string }

/** docs/02 C15 · offer form: pick one of your available listings, optional
 *  message and a proposed meetup. One active offer per wanted item (SQL rule). */
export function OfferForm({
  wantedId,
  wantedTitle,
  myItems,
  spots,
}: {
  wantedId: string
  wantedTitle: string
  myItems: MyItem[]
  spots: Spot[]
}) {
  const router = useRouter()
  const { show } = useToast()
  const [offeredItemId, setOfferedItemId] = useState(myItems[0]?.id ?? '')
  const [message, setMessage] = useState('')
  const [spotId, setSpotId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [flexibility, setFlexibility] = useState('')
  const [globalMsg, setGlobalMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalMsg(null)
    if (!offeredItemId) {
      setGlobalMsg('Pick one of your listings to offer.')
      return
    }
    const proposedAt =
      date && time ? new Date(`${date}T${time}:00`).toISOString() : undefined
    startTransition(async () => {
      const res = await createOffer({
        wantedItemId: wantedId,
        offeredItemId,
        message: message.trim() || undefined,
        proposedSpotId: spotId,
        proposedAt,
        flexibility: flexibility.trim() || undefined,
      })
      if (!res.ok) {
        setGlobalMsg(res.error)
        return
      }
      show('Offer sent — the owner has 3 days to answer')
      router.push('/offers?view=sent')
      router.refresh()
    })
  }

  return (
    <form onSubmit={send} className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        {globalMsg ? (
          <Notice tone="danger" icon="alert">
            <div className="font-medium">We could not send that offer</div>
            <p className="t-small mt-1">{globalMsg} Reference: CT-OFR-404</p>
          </Notice>
        ) : null}

        <section className="border border-line rounded-md bg-surface p-6">
          <div className="t-h3 mb-1">What you are offering</div>
          <p className="t-small text-ink45 mb-4">
            Pick one of your available listings — you can only have one active offer per listing.
          </p>
          <div className="space-y-2.5">
            {myItems.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3.5 border rounded-sm p-3 cursor-pointer transition-colors ${
                  offeredItemId === item.id
                    ? 'border-ink bg-paper2'
                    : 'border-line hover:border-linestrong'
                }`}
              >
                <input
                  type="radio"
                  name="offeredItem"
                  className="sr-only"
                  checked={offeredItemId === item.id}
                  onChange={() => setOfferedItemId(item.id)}
                />
                <span className="w-12 h-12 rounded-sm bg-paper2 border border-line overflow-hidden flex-none">
                  {item.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-ink45">
                      <Icon name="box" size={18} />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] text-ink truncate">{item.title}</span>
                  <span className="block t-meta">{item.status}</span>
                </span>
                <span
                  className={`w-5 h-5 rounded-full border flex-none inline-flex items-center justify-center ${
                    offeredItemId === item.id ? 'bg-ink border-ink' : 'border-linestrong'
                  }`}
                >
                  {offeredItemId === item.id ? (
                    <Icon name="check" size={12} className="text-paper" />
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4">
            <Link
              href="/my-listings"
              className="t-meta underline underline-offset-[3px] hover:text-accent"
            >
              Manage my listings
            </Link>
          </div>
        </section>

        <section className="border border-line rounded-md bg-surface p-6 space-y-5">
          <div className="t-h3">Message to the owner</div>
          <Field
            label="Message (optional)"
            hint={`${message.length}/500 — say why you think the swap works`}
          >
            <Textarea
              value={message}
              maxLength={500}
              rows={4}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi! ${wantedTitle} would be perfect for my kids — mine is barely used…`}
            />
          </Field>
        </section>

        <section className="border border-line rounded-md bg-surface p-6 space-y-5">
          <div className="t-h3">Proposed meetup</div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Spot">
              <Select value={spotId} onChange={(e) => setSpotId(e.target.value)}>
                <option value="">Let them choose</option>
                {spots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Time">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <Field label="Flexibility (optional)" hint="e.g. “Weekends only, after 3pm”.">
            <Input
              value={flexibility}
              maxLength={120}
              onChange={(e) => setFlexibility(e.target.value)}
            />
          </Field>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" loading={pending}>
            Send offer
          </Button>
          <ButtonLink href={`/items/${wantedId}`} variant="ghost" size="lg">
            Cancel
          </ButtonLink>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="border border-line rounded-md bg-surface p-5 sticky top-24">
          <div className="t-meta mb-3">How it works</div>
          <ol className="space-y-3">
            {[
              'You send the offer — it stays pending for 3 days.',
              'The owner accepts, and both listings go to Pending.',
              'You agree a meetup spot and time inside the trade page.',
              'Both sides confirm at the meetup — then you rate each other.',
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="font-mono text-[11px] text-ink45 w-5 flex-none pt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="t-small text-ink70">{step}</span>
              </li>
            ))}
          </ol>
          <div className="h-px bg-line my-4" />
          <div className="flex items-start gap-2.5 text-[13.5px] text-ink70">
            <Icon name="shield" size={18} className="flex-none mt-px text-olive" />
            <span>Meet in daylight at a public spot. CaintaTrade never handles cash.</span>
          </div>
        </div>
      </aside>
    </form>
  )
}
