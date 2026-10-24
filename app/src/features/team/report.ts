// Pilot report exports. One list of rows feeds the CSV and the PDF, so both carry the screen's figures.
import type { jsPDF as JsPdf } from 'jspdf'
import type { autoTable as AutoTable } from 'jspdf-autotable'
import type { PilotData } from '@/hooks'
import { formatCents } from '@/lib/money'
import { TAG_LABEL, TARGET_CHEAP_SHARE, TARGET_FOOD_COST, TARGET_REPEAT, TARGET_WALKUP_MIN, pilotFigures } from './pilotFigures'

export const REPORT_TITLE = 'Blazer Bites pilot results'

export interface ReportRow {
  section: 'Taste' | 'Time' | 'Price' | 'Viability'
  metric: string
  value: string
  target: string
  status: string
}

export const stars = (n: number | null): string => (n === null ? '—' : n.toFixed(2))
export const minutes = (n: number | null): string => (n === null ? '—' : `${n.toFixed(1)} min`)
export const pct = (n: number | null): string => (n === null ? '—' : `${Math.round(n * 100)}%`)
/** Compare shares as displayed (whole percent), so a shown 40% never reads as missing a 40% target. */
export const shareMeets = (n: number, target: number): boolean => Math.round(n * 100) >= Math.round(target * 100)
const FLAG_TEXT = { cut: 'Fix or cut', promote: 'Ready for the fixed menu' } as const
const meets = (ok: boolean) => (ok ? 'On target' : 'Off target')

export function reportRows(data: PilotData): ReportRow[] {
  const f = pilotFigures(data)
  const { time: t, price: p, viability: v } = data
  const taste: ReportRow[] = data.taste.flatMap((d) => [
    {
      section: 'Taste',
      metric: `${d.name} · 14-day avg (${d.count14} ratings)`,
      value: stars(d.avg14),
      target: d.is_special ? '≥ 4.30 for the fixed menu' : '≥ 4.00',
      status: d.flag ? FLAG_TEXT[d.flag] : '',
    },
    {
      section: 'Taste',
      metric: `${d.name} · 7-day avg (${d.count7} ratings)`,
      value: stars(d.avg7),
      target: '',
      status: f.dishes[d.id].topTags.map((x) => `${TAG_LABEL[x.tag]} ${x.count}`).join(', '),
    },
  ])
  const dishCost: ReportRow[] = data.taste.map((d) => ({
    section: 'Price',
    metric: `Food cost · ${d.name}`,
    value: pct(f.dishes[d.id].foodCostPct),
    target: `~${pct(TARGET_FOOD_COST)}`,
    status: '',
  }))
  return [
    ...taste,
    { section: 'Time', metric: `Pre-order median, arrival to food (${t.preorder.count} orders)`, value: minutes(t.preorder.medianMin), target: `< ${t.targetPreorderMin} min`, status: meets((t.preorder.medianMin ?? 0) < t.targetPreorderMin) },
    { section: 'Time', metric: 'Pre-order p90', value: minutes(t.preorder.p90Min), target: `< ${t.targetPreorderMin} min`, status: meets((t.preorder.p90Min ?? 0) < t.targetPreorderMin) },
    { section: 'Time', metric: `Walk-up median (${t.walkup.count} orders)`, value: minutes(t.walkup.medianMin), target: `< ${TARGET_WALKUP_MIN} min`, status: meets((t.walkup.medianMin ?? 0) < TARGET_WALKUP_MIN) },
    { section: 'Time', metric: 'Walk-up p90', value: minutes(t.walkup.p90Min), target: `< ${TARGET_WALKUP_MIN} min`, status: meets((t.walkup.p90Min ?? 0) < TARGET_WALKUP_MIN) },
    { section: 'Time', metric: 'Waits over 10 min', value: String(t.over10), target: '0', status: meets(t.over10 === 0) },
    { section: 'Time', metric: `Windows that hit the ${f.cap}-order cap`, value: `${f.windowsAtCap} of ${f.windowCount}`, target: '0', status: f.needsCapacity ? 'Needs a second cart or more windows' : meets(f.windowsAtCap === 0) },
    { section: 'Price', metric: 'Highest price', value: formatCents(p.maxPriceCents), target: `≤ ${formatCents(p.capCents)}`, status: meets(p.allUnderCap) },
    { section: 'Price', metric: '$5 item', value: p.fiveDollarItem ?? '—', target: 'Always one', status: meets(p.fiveDollarItem !== null) },
    { section: 'Price', metric: `Orders ≤ $7 (${data.orderCount} orders)`, value: pct(p.shareOrdersUnder7), target: `${pct(TARGET_CHEAP_SHARE)}`, status: meets(shareMeets(p.shareOrdersUnder7, TARGET_CHEAP_SHARE)) },
    { section: 'Price', metric: 'Food cost · all meals', value: pct(p.foodCostPct), target: `~${pct(TARGET_FOOD_COST)}`, status: '' },
    ...dishCost,
    ...v.perCart.map((c): ReportRow => ({ section: 'Viability', metric: `Orders/day · ${c.name}`, value: c.ordersPerDay.toFixed(1), target: `${v.breakEven} break-even · ${v.target} target`, status: c.ordersPerDay >= v.breakEven ? 'Above break-even' : 'Below break-even' })),
    { section: 'Viability', metric: 'Orders/day/cart · average', value: v.avgOrdersPerDayPerCart.toFixed(1), target: `${v.breakEven} break-even · ${v.target} target`, status: v.avgOrdersPerDayPerCart >= v.breakEven ? 'Above break-even' : 'Below break-even' },
    { section: 'Viability', metric: `Repeat customers within 30 days (${v.customers} customers)`, value: pct(v.repeatRate), target: pct(TARGET_REPEAT), status: meets(shareMeets(v.repeatRate, TARGET_REPEAT)) },
  ]
}

const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

export function buildPilotCsv(data: PilotData): string {
  const head = [[REPORT_TITLE], [`Sample data ${data.from} to ${data.to}`, `${data.serviceDays} service days`, `${data.orderCount} orders`], [pilotFigures(data).finding], []]
  const table = [['Section', 'Metric', 'Value', 'Target', 'Status'], ...reportRows(data).map((r) => [r.section, r.metric, r.value, r.target, r.status])]
  return [...head, ...table].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

export interface PdfDeps {
  jsPDF: typeof JsPdf
  autoTable: typeof AutoTable
}

/** jsPDF's built-in fonts are Latin-1 only, so the PDF spells out the symbols the screen uses. */
const latin1 = (s: string) => s.replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/·/g, '-').replace(/—/g, '-').replace(/~/g, 'about ')

export function buildPilotPdf(data: PilotData, { jsPDF, autoTable }: PdfDeps): JsPdf {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  doc.setFontSize(18)
  doc.text(REPORT_TITLE, 40, 56)
  doc.setFontSize(11)
  doc.text(`Sample data, ${data.from} to ${data.to} (${data.serviceDays} service days, ${data.orderCount} orders)`, 40, 76)
  doc.text(latin1(pilotFigures(data).finding), 40, 94)
  autoTable(doc, {
    startY: 110,
    head: [['Section', 'Metric', 'Value', 'Target', 'Status']],
    body: reportRows(data).map((r) => [r.section, r.metric, r.value, r.target, r.status].map(latin1)),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [26, 86, 50] },
    columnStyles: { 2: { halign: 'right' } },
  })
  return doc
}

export function pilotFileName(data: PilotData, ext: 'csv' | 'pdf'): string {
  return `blazer-bites-pilot-${data.from}-to-${data.to}.${ext}`
}
