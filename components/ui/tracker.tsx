import { Icon } from './icon'

export type TrackerStep = {
  label: string
  time?: string
  state?: 'done' | 'now' | 'todo'
}

/** Step tracker (mockup .tracker): horizontal on desktop, vertical on mobile,
 *  connector line turns olive once a step is done. */
export function Tracker({ steps, className = '' }: { steps: TrackerStep[]; className?: string }) {
  return (
    <div className={`flex max-md:flex-col ${className}`}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        const lineColor = s.state === 'done' ? 'bg-olive' : 'bg-linestrong'
        return (
          <div key={s.label} className="relative flex flex-col gap-2.5 pr-3 max-md:flex-row max-md:gap-3 max-md:pb-4">
            {!last ? (
              <>
                <span
                  aria-hidden="true"
                  className={`absolute left-6 right-0 top-[11px] h-px hidden md:block ${lineColor}`}
                />
                <span
                  aria-hidden="true"
                  className={`absolute left-[11px] top-[22px] bottom-0 w-px md:hidden ${lineColor}`}
                />
              </>
            ) : null}
            <StepDot n={i + 1} state={s.state} />
            <div className="min-w-0">
              <div
                className={`text-[13px] leading-[1.35] ${
                  s.state === 'done' || s.state === 'now' ? 'text-ink font-medium' : 'text-ink70'
                }`}
              >
                {s.label}
              </div>
              {s.time ? <div className="font-mono text-[11px] text-ink45">{s.time}</div> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StepDot({ n, state }: { n: number; state?: TrackerStep['state'] }) {
  const base =
    'w-[23px] h-[23px] rounded-full border flex-none flex items-center justify-center font-mono text-[10px] relative z-[1]'
  if (state === 'done') {
    return (
      <span className={`${base} bg-olive border-olive text-white`}>
        <Icon name="check" size={12} />
      </span>
    )
  }
  if (state === 'now') {
    return (
      <span className={`${base} bg-accent border-accent text-white shadow-[0_0_0_4px_rgba(200,69,42,.16)]`}>
        {n}
      </span>
    )
  }
  return <span className={`${base} bg-surface border-linestrong text-ink45`}>{n}</span>
}
