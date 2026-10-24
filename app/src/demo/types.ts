import type { CartTint, LoyaltyCard, MenuItem, Order, OrderItem, PickupWindow, Profile, Rating, Spot, WindowHold, Cart } from '@/types/app'

/**
 * A stored order. `auto` says what moves it on a timer: 'user' (the demo student's order:
 * Cooking ~8 s, Ready ~25 s after placing), 'crowd' (seeded orders, handed off around `due_at`),
 * or null once someone moved it by hand. `mine` = placed on this device (shows in Orders).
 */
export type DemoOrder = Order & {
  auto: 'user' | 'crowd' | null
  mine: boolean
  due_at: string | null
}

/** A stored cart: the computed fields (live_wait_min, orders_ahead, next_window_start) are refreshed after every change. */
export type DemoCart = Cart & { tint: CartTint; next_pickup_number: number }

export interface DemoSettings {
  /** The student's own orders move Received → Cooking → Ready by themselves. */
  autoAdvance: boolean
}

export interface DemoState {
  version: 1
  /** When this state was seeded (changes on resetDemo). */
  seededAt: string
  spots: Spot[]
  carts: DemoCart[]
  menu: MenuItem[]
  windows: PickupWindow[]
  holds: WindowHold[]
  orders: DemoOrder[]
  orderItems: OrderItem[]
  ratings: Rating[]
  loyalty: LoyaltyCard
  profile: Profile
  settings: DemoSettings
}
