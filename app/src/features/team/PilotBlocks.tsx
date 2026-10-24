// The four pilot dashboard blocks. Every figure comes from usePilotStats() or pilotFigures(), the
// same values the CSV and PDF exports print.
import type { ReactNode } from 'react'
import type { PilotData } from '@/hooks'
import { cn } from '@/lib/cn'
import { formatCents } from '@/lib/money'
import { RULES } from '@/config/rules'
import { TAG_LABEL, TARGET_CHEAP_SHARE, TARGET_FOOD_COST, TARGET_REPEAT, TARGET_WALKUP_MIN, type PilotFigures } from './pilotFigures'
import { minutes, pct, shareMeets, stars } from './report'
import { RefLabels, Track, type Ref } from './Track'

type Tone = 'positive' | 'danger' | 'warning' | 'neutral'
const TONE: Record<Tone, string> = {
  positive: 'bg-positive-bg text-positive-ink',
  danger: 'bg-danger-bg text-danger-ink',
  warning: 'bg-warning-bg text-warning-ink',
  neutral: 'bg-neutral-bg text-neutral-ink',
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn('inline-flex flex-none items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold whitespace-nowrap', TONE[tone])}>{children}</span>
}

function Block({ id, title, aside, className, children }: { id: string; title: string; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn('rounded-card bg-surface p-5', className)}>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {aside && <p className="text-[13px] text-muted">{aside}</p>}
      </header>
      {children}
    </section>
  )
}

/** A figure with its label above and its target beside it. */
function Figure({ label, value, target, status }: { label: string; value: string; target?: string; status?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="num text-2xl font-semibold">{value}</span>
        {target && <span className="num text-[13px] text-muted">{target}</span>}
        {status}
      </p>
    </div>
  )
}

const ok = (good: boolean, yes = 'On target', no = 'Off target') => <Pill tone={good ? 'positive' : 'warning'}>{good ? yes : no}</Pill>

// ── Taste ────────────────────────────────────────────────────────────────────

const STAR_MIN = 1
const STAR_MAX = 5
const STAR_REFS: Ref[] = [
  { value: RULES.cutThreshold, label: `${RULES.cutThreshold.toFixed(1)} cut`, side: 'left' },
  { value: RULES.fixedMenuThreshold, label: `${RULES.fixedMenuThreshold.toFixed(1)} fixed menu` },
]

function FlagPill({ flag }: { flag: PilotData['taste'][number]['flag'] }) {
  if (flag === 'cut') return <Pill tone="danger">Fix or cut</Pill>
  if (flag === 'promote') return <Pill tone="positive">Ready for the fixed menu</Pill>
  return null
}

const dishName = (n: string) => n.replace(/^Sample:\s*/, '')

export function TasteBlock({ data, figures }: { data: PilotData; figures: PilotFigures }) {
  const tags = (id: string) => figures.dishes[id].topTags.map((t) => `${TAG_LABEL[t.tag]} ${t.count}`).join(' · ') || '—'
  return (
    <Block id="taste" title="Taste" aside={`Average stars per dish · cut under ${RULES.cutThreshold.toFixed(1)} over 14 days`}>
      {/* Tablet and up: a table with the 14-day average drawn in its row. */}
      <table className="num hidden w-full text-[15px] whitespace-nowrap md:table">
        <thead>
          <tr className="text-[13px] text-muted">
            <th className="pb-2 text-left font-normal">Dish</th>
            <th className="w-[30%] px-3 pb-0 font-normal">
              <span className="sr-only">14-day average on a 1 to 5 scale</span>
              <RefLabels refs={STAR_REFS} min={STAR_MIN} max={STAR_MAX} />
            </th>
            <th className="pb-2 text-right font-normal">14 days</th>
            <th className="pb-2 text-right font-normal">7 days</th>
            <th className="pb-2 text-right font-normal">Ratings</th>
            <th className="pb-2 pl-4 text-left font-normal">Top tags</th>
          </tr>
        </thead>
        <tbody>
          {data.taste.map((d) => (
            <tr key={d.id} className="border-t border-line">
              <td className="py-3 pr-3">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{dishName(d.name)}</span>
                  {d.is_special && <span className="text-[13px] text-muted">special</span>}
                  <FlagPill flag={d.flag} />
                </span>
              </td>
              <td className="py-3">
                <Track value={d.avg14} min={STAR_MIN} max={STAR_MAX} refs={STAR_REFS} label={`${dishName(d.name)}: ${stars(d.avg14)} stars over 14 days`} />
              </td>
              <td className="py-3 text-right font-semibold">{stars(d.avg14)}</td>
              <td className="py-3 text-right">{stars(d.avg7)}</td>
              <td className="py-3 text-right text-muted">{d.count14}</td>
              <td className="py-3 pl-4 text-[13px] whitespace-normal text-muted">{tags(d.id)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Phone: two-line rows, nothing dropped. */}
      <ul className="md:hidden">
        {data.taste.map((d) => (
          <li key={d.id} className="border-t border-line py-3 first:border-t-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{dishName(d.name)}</span>
              <span className="num text-lg font-semibold">{stars(d.avg14)}</span>
            </div>
            <Track className="mt-2" value={d.avg14} min={STAR_MIN} max={STAR_MAX} refs={STAR_REFS} label={`${dishName(d.name)}: ${stars(d.avg14)} stars over 14 days`} />
            <p className="num mt-2 text-[13px] text-muted">
              7 days {stars(d.avg7)} · {d.count14} ratings · {tags(d.id)}
            </p>
            {d.flag && (
              <div className="mt-2">
                <FlagPill flag={d.flag} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </Block>
  )
}

// ── Time ─────────────────────────────────────────────────────────────────────

const TIME_MAX = 12

function WaitRow({ name, s, target }: { name: string; s: PilotData['time']['preorder']; target: number }) {
  const refs: Ref[] = [
    { value: target, label: `${target} min target`, side: target > 5 ? 'left' : 'right' },
    { value: RULES.maxWaitMin, label: `${RULES.maxWaitMin} max` },
  ]
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-semibold">
          {name} <span className="num font-normal text-muted">· {s.count} orders</span>
        </p>
        <p className="num text-[15px]">
          median <span className="font-semibold">{minutes(s.medianMin)}</span> · p90 <span className="font-semibold">{minutes(s.p90Min)}</span>
        </p>
      </div>
      <RefLabels refs={refs} min={0} max={TIME_MAX} />
      <Track value={s.medianMin} tick={s.p90Min} min={0} max={TIME_MAX} refs={refs} label={`${name}: median ${minutes(s.medianMin)}, p90 ${minutes(s.p90Min)}, target ${target} min`} />
    </div>
  )
}

export function TimeBlock({ data, figures }: { data: PilotData; figures: PilotFigures }) {
  const t = data.time
  return (
    <Block id="time" title="Time" aside="Arrival to food in hand · bar = median, tick = p90">
      <div className="flex flex-col gap-5">
        <WaitRow name="Pre-orders" s={t.preorder} target={t.targetPreorderMin} />
        <WaitRow name="Walk-ups" s={t.walkup} target={TARGET_WALKUP_MIN} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
        <Figure label="Waits over 10 min" value={String(t.over10)} target="target 0" status={ok(t.over10 === 0)} />
        <Figure label={`Windows at the ${figures.cap}-order cap`} value={String(figures.windowsAtCap)} target={`of ${figures.windowCount}`} />
      </div>
      {figures.needsCapacity && (
        <p className="mt-4 rounded-inner bg-warning-bg px-3 py-2 text-[15px] font-semibold text-warning-ink">Needs a second cart or more windows</p>
      )}
    </Block>
  )
}

// ── Price ────────────────────────────────────────────────────────────────────

export function PriceBlock({ data, figures }: { data: PilotData; figures: PilotFigures }) {
  const p = data.price
  const cheapRefs: Ref[] = [{ value: TARGET_CHEAP_SHARE * 100, label: `${pct(TARGET_CHEAP_SHARE)} target` }]
  return (
    <Block id="price" title="Price" aside={`${data.orderCount.toLocaleString('en-US')} orders`}>
      <div className="grid grid-cols-2 gap-4">
        <Figure label="Highest price" value={formatCents(p.maxPriceCents)} target={`cap ${formatCents(p.capCents)}`} status={ok(p.allUnderCap)} />
        <Figure label="$5 item" value={p.fiveDollarItem ? formatCents(500) : '—'} status={ok(p.fiveDollarItem !== null, 'On the menu', 'Missing')} />
      </div>
      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] text-muted">Orders $7 or less</p>
          <p className="num">
            <span className="text-lg font-semibold">{pct(p.shareOrdersUnder7)}</span>{' '}
            <span className="text-[13px] text-muted">target {pct(TARGET_CHEAP_SHARE)}</span>
          </p>
        </div>
        <RefLabels refs={cheapRefs} min={0} max={100} />
        <Track value={p.shareOrdersUnder7 * 100} min={0} max={100} refs={cheapRefs} label={`${pct(p.shareOrdersUnder7)} of orders were $7 or less, target ${pct(TARGET_CHEAP_SHARE)}`} />
      </div>
      <table className="num mt-5 w-full text-[15px]">
        <thead>
          <tr className="text-[13px] text-muted">
            <th className="pb-1 text-left font-normal">Food cost</th>
            <th className="pb-1 text-right font-normal">target ~{pct(TARGET_FOOD_COST)}</th>
          </tr>
        </thead>
        <tbody>
          {data.taste.map((d) => (
            <tr key={d.id} className="border-t border-line">
              <td className="py-1.5">{dishName(d.name)}</td>
              <td className="py-1.5 text-right">{pct(figures.dishes[d.id].foodCostPct)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line font-semibold">
            <td className="py-1.5">All meals</td>
            <td className="py-1.5 text-right">{pct(p.foodCostPct)}</td>
          </tr>
        </tfoot>
      </table>
    </Block>
  )
}

// ── Viability ────────────────────────────────────────────────────────────────

const ORDERS_MAX = 120

export function ViabilityBlock({ data }: { data: PilotData }) {
  const v = data.viability
  const refs: Ref[] = [
    { value: v.breakEven, label: `${v.breakEven} break-even` },
    { value: v.target, label: `${v.target} target` },
  ]
  return (
    <Block id="viability" title="Viability" aside={`Orders per service day · ${data.serviceDays} days`}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <div className="grid grid-cols-[7.5rem_minmax(0,1fr)_3rem] items-center gap-x-3">
            <span />
            <RefLabels refs={refs} min={0} max={ORDERS_MAX} />
            <span />
            {v.perCart.map((c) => (
              <div key={c.cartId} className="contents">
                <span className="truncate py-2 text-[15px]">{c.name}</span>
                <Track value={c.ordersPerDay} min={0} max={ORDERS_MAX} refs={refs} label={`${c.name}: ${c.ordersPerDay.toFixed(1)} orders a day`} />
                <span className="num text-right text-[15px] font-semibold">{c.ordersPerDay.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 content-start gap-4 md:grid-cols-1">
          <Figure
            label="Orders/day/cart, average"
            value={v.avgOrdersPerDayPerCart.toFixed(1)}
            target={`break-even ${v.breakEven} · target ${v.target}`}
            status={ok(v.avgOrdersPerDayPerCart >= v.breakEven, 'At break-even', 'Below break-even')}
          />
          <Figure
            label="Repeat customers within 30 days"
            value={pct(v.repeatRate)}
            target={`target ${pct(TARGET_REPEAT)} · ${v.customers.toLocaleString('en-US')} customers`}
            status={ok(shareMeets(v.repeatRate, TARGET_REPEAT))}
          />
        </div>
      </div>
    </Block>
  )
}
