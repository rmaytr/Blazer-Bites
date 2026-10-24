import type { CartTint } from '@/types/app'

/** Pale tile + same-hue ink for each cart. */
export const TINT: Record<CartTint, string> = {
  sky: 'bg-sky-tint text-sky-ink',
  campus: 'bg-campus-tint text-campus-ink',
  gold: 'bg-gold-tint text-gold-ink',
  evergreen: 'bg-evergreen-tint text-evergreen-ink',
}

/** Brand accent per cart, for map pins. */
export const PIN: Record<CartTint, string> = {
  sky: 'bg-sky',
  campus: 'bg-campus',
  gold: 'bg-gold',
  evergreen: 'bg-evergreen',
}
