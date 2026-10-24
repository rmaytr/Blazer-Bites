// Pilot dashboard (/team/pilot): is the pilot hitting taste, time and price? Owned by workstream C.
import { useMemo, useState } from 'react'
import { Button, Skeleton, toast } from '@/components/ui'
import { usePilotStats, type PilotData } from '@/hooks'
import { PriceBlock, TasteBlock, TimeBlock, ViabilityBlock } from '@/features/team/PilotBlocks'
import { pilotFigures } from '@/features/team/pilotFigures'
import { buildPilotCsv, buildPilotPdf, pilotFileName } from '@/features/team/report'

const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const range = (from: string, to: string) => `${day.format(new Date(`${from}T12:00:00Z`))} – ${day.format(new Date(`${to}T12:00:00Z`))}`

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Exports({ data }: { data: PilotData }) {
  const [busy, setBusy] = useState(false)
  const csv = () => {
    try {
      saveBlob(new Blob([buildPilotCsv(data)], { type: 'text/csv;charset=utf-8' }), pilotFileName(data, 'csv'))
    } catch (err) {
      toast.error(`Couldn't export the CSV: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }
  const pdf = async () => {
    setBusy(true)
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
      buildPilotPdf(data, { jsPDF, autoTable }).save(pilotFileName(data, 'pdf'))
    } catch (err) {
      toast.error(`Couldn't export the PDF: ${err instanceof Error ? err.message : 'unknown error'}`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-none gap-2">
      <Button variant="secondary" onClick={csv}>
        Export CSV
      </Button>
      <Button onClick={pdf} loading={busy}>
        Export PDF
      </Button>
    </div>
  )
}

export default function Pilot() {
  const { data, loading } = usePilotStats()
  const figures = useMemo(() => (data ? pilotFigures(data) : null), [data])

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pt-2 pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Pilot results</h1>
          {figures && <p className="mt-1 text-base font-semibold">{figures.finding}</p>}
          {data && (
            <p className="num mt-1 text-[13px] text-muted">
              Sample data · last 14 days · {range(data.from, data.to)} · {data.serviceDays} service days · {data.orderCount.toLocaleString('en-US')} orders
            </p>
          )}
        </div>
        {data && <Exports data={data} />}
      </header>

      {loading || !data || !figures ? (
        <div className="grid gap-4">
          <Skeleton className="h-80 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <TasteBlock data={data} figures={figures} />
          </div>
          <TimeBlock data={data} figures={figures} />
          <PriceBlock data={data} figures={figures} />
          <div className="lg:col-span-2">
            <ViabilityBlock data={data} />
          </div>
        </div>
      )}
    </>
  )
}
