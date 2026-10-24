const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** Integer cents to "$7.50". Money is integer cents everywhere else. */
export function formatCents(cents: number): string {
  return usd.format(cents / 100)
}
