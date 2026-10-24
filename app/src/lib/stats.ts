/** Continuous percentile (same as Postgres percentile_cont), p in [0, 1]. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null
  const xs = [...values].sort((a, b) => a - b)
  const pos = (xs.length - 1) * p
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)
}

export const median = (values: readonly number[]): number | null => percentile(values, 0.5)
export const p90 = (values: readonly number[]): number | null => percentile(values, 0.9)
