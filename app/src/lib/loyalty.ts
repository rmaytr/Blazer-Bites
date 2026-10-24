// Client mirror of the loyalty part of quote_order. The server quote is authoritative.

export interface LoyaltyQuote {
  subtotalCents: number
  discountCents: number
  totalCents: number
  loyaltyApplied: boolean
}

/**
 * `unitPricesCents` has one entry per meal (qty expanded). With a reward available,
 * the most expensive meal is free; one reward per order.
 */
export function applyLoyalty(unitPricesCents: readonly number[], rewardsAvailable: number): LoyaltyQuote {
  const subtotalCents = unitPricesCents.reduce((s, c) => s + c, 0)
  const loyaltyApplied = rewardsAvailable > 0 && unitPricesCents.length > 0
  const discountCents = loyaltyApplied ? Math.max(...unitPricesCents) : 0
  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents, loyaltyApplied }
}
