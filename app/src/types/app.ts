// App-level types. Row shapes derive from Database (src/types/db.ts, type-only: the Supabase backend is archived);
// the demo store (src/demo) holds rows of exactly these shapes.
import type { Database } from './db'

type Public = Database['public']
type Row<T extends keyof Public['Tables']> = Public['Tables'][T]['Row']

export type Role = Public['Enums']['user_role']
export type OrderStatus = Public['Enums']['order_status']
export type Channel = Public['Enums']['order_channel']
export type PaymentMethod = Public['Enums']['payment_method']
export type ItemStatus = Public['Enums']['item_status']
export type PrepKind = Public['Enums']['prep_kind']

/** A class gap (free slot between classes) on a weekday, campus time, 'HH:MM' 24h. */
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export interface ClassGap {
  day: Weekday
  start: string
  end: string
}

export type Profile = Omit<Row<'users'>, 'class_gaps'> & { class_gaps: ClassGap[] }
export type Spot = Row<'spots'>
export type Cart = Row<'carts'>
/** Cart tile colour key: bg-{tint}-tint text-{tint}-ink. Sterne sky, Campus Green campus, Biz & Eng gold, Medical evergreen. */
export type CartTint = 'sky' | 'campus' | 'gold' | 'evergreen'
export type CartWithSpot = Cart & { spot: Spot | null; tint: CartTint }
export type ServiceDay = Row<'service_days'>
export type PickupWindow = Row<'pickup_windows'>
/** useWindows row: spots_left already subtracts live holds; is_full = no spot can be held. */
export type WindowWithSpots = PickupWindow & { spots_left: number; is_full: boolean }
export type WindowHold = Row<'window_holds'>
export type MenuItem = Row<'menu_items'>
/** cooking_at is demo-only (the archived schema had no column for it). */
export type Order = Row<'orders'> & { cooking_at: string | null }
export type OrderItem = Row<'order_items'>
export type Rating = Row<'ratings'>
export type LoyaltyCard = Row<'loyalty_cards'>
export type Settings = Row<'settings'>
export type WaitSnapshot = Row<'wait_snapshots'>
export type PrepCheck = Row<'prep_checks'>

export type RatingTag = 'too_salty' | 'perfect' | 'cold' | 'small_portion' | 'order_again'

export interface BasketLine {
  menuItemId: string
  variant?: string
  qty: number
}

export interface GuestInfo {
  name: string
  phone: string
}

export interface PlacedOrder {
  orderId: string
  pickupNumber: number
  accessToken: string
  totalCents: number
}

export interface Quote {
  subtotalCents: number
  discountCents: number
  totalCents: number
  loyaltyApplied: boolean
}

/** An order line as the token RPCs return it: the line plus its dish and its rating, if any. */
export type OrderViewItem = Pick<OrderItem, 'id' | 'menu_item_id' | 'variant' | 'qty' | 'unit_price_cents'> & {
  name: string
  photo_url: string | null
  rated: boolean
  stars: number | null
}

/** Shape of get_order_by_token / find_order_for_handoff (jsonb from public.order_json). Flat. */
export type OrderView = Pick<
  Order,
  | 'id'
  | 'cart_id'
  | 'window_id'
  | 'original_window_id'
  | 'moved_late'
  | 'status'
  | 'pickup_number'
  | 'channel'
  | 'payment_method'
  | 'subtotal_cents'
  | 'discount_cents'
  | 'total_cents'
  | 'loyalty_applied'
  | 'access_token'
  | 'placed_at'
  | 'cooking_at'
  | 'ready_at'
  | 'arrived_at'
  | 'picked_up_at'
> & {
  cart_name: string
  spot_name: string
  window_starts_at: string | null
  window_ends_at: string | null
  /** Guest name or the account's display name. */
  customer_name: string | null
  items: OrderViewItem[]
}

/** An order line with its dish and whether it has been rated. */
export type OrderLine = OrderItem & {
  menu_item: Pick<MenuItem, 'id' | 'name' | 'photo_url' | 'price_cents'> | null
  rated: boolean
  stars: number | null
}

/** An order with its lines, cart name, customer name and pickup window (useMyOrders, useKitchenOrders). */
export type OrderWithItems = Order & {
  items: OrderLine[]
  cart_name: string
  customer_name: string | null
  window: Pick<PickupWindow, 'id' | 'starts_at' | 'ends_at'> | null
}

/** Kitchen board row (same shape; grouped by `window`). */
export type KitchenOrder = OrderWithItems
