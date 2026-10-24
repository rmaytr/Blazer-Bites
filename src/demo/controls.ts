// Instant (no latency) controls for Profile → Demo controls and the Team view.
// They change the shared demo store, so every screen updates live.
import { actions } from './actions'

export type { ProfilePatch } from './actions'

export const {
  setCartSurge,
  advanceOrder,
  markPickedUp,
  setWalkupLine,
  setItemSoldOut,
  setAutoAdvance,
  updateProfile,
  resetDemo,
  openCart,
  closeCart,
  advanceOrderStatus,
} = actions
