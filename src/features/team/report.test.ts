import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { usePilotStats } from '@/hooks'
import { REPORT_TITLE, buildPilotCsv, buildPilotPdf, reportRows } from './report'
import { pilotFigures } from './pilotFigures'

describe('pilot report', () => {
  const { result } = renderHook(() => usePilotStats())
  const data = result.current.data!

  it('CSV carries the title, date range, finding and every figure', () => {
    const csv = buildPilotCsv(data)
    const lines = csv.trim().split('\r\n')
    expect(lines[0]).toBe(REPORT_TITLE)
    expect(lines[1]).toContain(`${data.from} to ${data.to}`)
    expect(csv).toContain('Shrimp & grits is ready for the fixed menu; Veggie wrap needs a fix or cut.')
    expect(csv).toContain('Section,Metric,Value,Target,Status')
    expect(csv).toContain('Fix or cut')
    expect(csv).toContain(`Waits over 10 min,${data.time.over10},0`)
    expect(lines.length).toBe(5 + reportRows(data).length)
  })

  it('flags capacity when walk-ups or long waits miss their target', () => {
    const f = pilotFigures(data)
    expect(f.needsCapacity).toBe(data.time.over10 > 0 || (data.time.walkup.p90Min ?? 0) > 6 || f.windowsAtCap > 0)
  })

  it('builds the PDF without throwing', () => {
    const doc = buildPilotPdf(data, { jsPDF, autoTable })
    expect(doc.getNumberOfPages()).toBeGreaterThan(0)
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(1000)
  })
})
