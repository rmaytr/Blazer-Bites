// Hand-written stand-in for `supabase gen types typescript`. The orchestrator will overwrite
// this file with generated types; src/types/app.ts derives from it so aliases survive.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

/** Row plus Insert (required keys + optional rest) and Update (all optional). */
type Table<Row, Required extends keyof Row, Relationships extends Rel[] = []> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>
  Update: Partial<Row>
  Relationships: Relationships
}

type UserRole = 'student' | 'crew' | 'lead' | 'admin'
type OrderStatus = 'received' | 'cooking' | 'ready' | 'picked_up' | 'cancelled'
type OrderChannel = 'app' | 'walk_up'
type PaymentMethod =
  | 'demo'
  | 'card'
  | 'apple_pay'
  | 'google_pay'
  | 'blazerbucks'
  | 'dragon_cash'
  | 'cash'
  | 'walkup_card'
type ItemStatus = 'active' | 'sold_out_global' | 'archived'
type PrepKind = 'taste' | 'hot_hold' | 'cold_hold' | 'food_safety'

export type Database = {
  public: {
    Tables: {
      users: Table<
        {
          id: string
          email: string | null
          display_name: string | null
          phone: string | null
          role: UserRole
          is_uab: boolean
          allergen_prefs: string[]
          favorite_item_ids: string[]
          class_gaps: Json
          notify_ready: boolean
          notify_reminder: boolean
          created_at: string
        },
        'id'
      >
      spots: Table<
        {
          id: string
          name: string
          lat: number
          lng: number
          notes: string | null
          is_placeholder: boolean
          is_late_night: boolean
        },
        'name' | 'lat' | 'lng'
      >
      carts: Table<
        {
          id: string
          name: string
          spot_id: string
          is_open: boolean
          surge: boolean
          surge_alert: boolean
          walkup_line: number
          sold_out_item_ids: string[]
          live_wait_min: number
          orders_ahead: number
          next_window_start: string | null
          avg_handoff_sec: number | null
          updated_at: string
        },
        'name' | 'spot_id',
        [
          {
            foreignKeyName: 'carts_spot_id_fkey'
            columns: ['spot_id']
            isOneToOne: false
            referencedRelation: 'spots'
            referencedColumns: ['id']
          },
        ]
      >
      service_days: Table<
        {
          id: string
          cart_id: string
          spot_id: string
          service_date: string
          opens_at: string
          closes_at: string
          is_late_night: boolean
          window_capacity: number
          next_pickup_number: number
        },
        'cart_id' | 'spot_id' | 'service_date' | 'opens_at' | 'closes_at'
      >
      pickup_windows: Table<
        {
          id: string
          cart_id: string
          service_day_id: string
          starts_at: string
          ends_at: string
          capacity: number
          booked_count: number
        },
        'cart_id' | 'service_day_id' | 'starts_at' | 'ends_at' | 'capacity',
        [
          {
            foreignKeyName: 'pickup_windows_cart_id_fkey'
            columns: ['cart_id']
            isOneToOne: false
            referencedRelation: 'carts'
            referencedColumns: ['id']
          },
        ]
      >
      window_holds: Table<{ id: string; window_id: string; holder: string; expires_at: string; created_at: string }, 'window_id' | 'holder' | 'expires_at'>
      menu_items: Table<
        {
          id: string
          name: string
          description: string | null
          price_cents: number
          plate_cost_cents: number
          photo_url: string | null
          allergens: string[]
          calories: number | null
          variants: string[]
          is_five_dollar_item: boolean
          is_special: boolean
          is_next_special: boolean
          is_express: boolean
          nutrition_verified: boolean
          status: ItemStatus
          avg_rating: number | null
          rating_count: number
          is_sample: boolean
          created_at: string
        },
        'name' | 'price_cents'
      >
      orders: Table<
        {
          id: string
          user_id: string | null
          guest_name: string | null
          guest_phone: string | null
          cart_id: string
          service_day_id: string
          window_id: string | null
          original_window_id: string | null
          moved_late: boolean
          status: OrderStatus
          pickup_number: number
          channel: OrderChannel
          payment_method: PaymentMethod
          payment_ref: string | null
          subtotal_cents: number
          discount_cents: number
          total_cents: number
          loyalty_applied: boolean
          access_token: string
          placed_at: string
          ready_at: string | null
          arrived_at: string | null
          picked_up_at: string | null
          reminder_sent_at: string | null
          is_sample: boolean
        },
        'cart_id' | 'service_day_id' | 'pickup_number' | 'channel' | 'payment_method' | 'subtotal_cents' | 'total_cents',
        [
          {
            foreignKeyName: 'orders_cart_id_fkey'
            columns: ['cart_id']
            isOneToOne: false
            referencedRelation: 'carts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_window_id_fkey'
            columns: ['window_id']
            isOneToOne: false
            referencedRelation: 'pickup_windows'
            referencedColumns: ['id']
          },
        ]
      >
      order_items: Table<
        {
          id: string
          order_id: string
          menu_item_id: string
          variant: string | null
          qty: number
          unit_price_cents: number
        },
        'order_id' | 'menu_item_id' | 'qty' | 'unit_price_cents',
        [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          },
        ]
      >
      ratings: Table<
        {
          id: string
          order_item_id: string
          stars: number
          tags: string[]
          comment: string | null
          created_at: string
          is_sample: boolean
        },
        'order_item_id' | 'stars',
        [
          {
            foreignKeyName: 'ratings_order_item_id_fkey'
            columns: ['order_item_id']
            isOneToOne: true
            referencedRelation: 'order_items'
            referencedColumns: ['id']
          },
        ]
      >
      loyalty_cards: Table<{ user_id: string; punches: number; rewards_available: number; lifetime_meals: number }, 'user_id'>
      wait_snapshots: Table<
        {
          id: number
          cart_id: string
          window_id: string | null
          taken_at: string
          wait_min: number
          orders_ahead: number
          walkup_line: number
          is_sample: boolean
        },
        'cart_id' | 'wait_min'
      >
      prep_checks: Table<
        {
          id: string
          cart_id: string
          service_date: string
          kind: PrepKind
          menu_item_id: string | null
          passed: boolean
          temp_f: number | null
          notes: string | null
          checked_by: string | null
          checked_at: string
        },
        'cart_id' | 'service_date' | 'kind' | 'passed'
      >
      settings: Table<
        {
          id: number
          window_min: number
          orders_per_window: number
          walkup_cutoff: number
          max_wait_min: number
          surge_trigger_min: number
          surge_windows: number
          express_size: number
          cut_threshold: number
          cut_days: number
          fixed_menu_threshold: number
          loyalty_every: number
          hold_min: number
          avg_walkup_service_sec: number
          default_handoff_sec: number
          demo_mode: boolean
        },
        'id'
      >
      push_subscriptions: Table<
        { id: string; user_id: string | null; order_id: string | null; endpoint: string; p256dh: string; auth: string; created_at: string },
        'endpoint' | 'p256dh' | 'auth'
      >
    }
    Views: { [_ in never]: never }
    Functions: {
      hold_window_spot: { Args: { p_window_id: string; p_holder: string }; Returns: { hold_id: string; expires_at: string }[] }
      release_hold: { Args: { p_hold_id: string }; Returns: undefined }
      quote_order: {
        Args: { p_items: Json; p_user_id?: string }
        Returns: { subtotal_cents: number; discount_cents: number; total_cents: number; loyalty_applied: boolean }[]
      }
      place_order: {
        Args: {
          p_hold_id: string
          p_items: Json
          p_payment_method: PaymentMethod
          p_payment_ref?: string
          p_guest_name?: string
          p_guest_phone?: string
          p_user_id?: string
        }
        Returns: { order_id: string; pickup_number: number; access_token: string; total_cents: number }[]
      }
      place_walkup_order: {
        Args: { p_cart_id: string; p_items: Json; p_payment_method: PaymentMethod }
        Returns: { order_id: string; pickup_number: number }[]
      }
      compute_cart_wait: {
        Args: { p_cart_id: string }
        Returns: { wait_min: number; orders_ahead: number; next_window_id: string | null; next_window_start: string | null; is_full: boolean }[]
      }
      snapshot_waits: { Args: Record<string, never>; Returns: number }
      check_surge: { Args: { p_cart_id: string }; Returns: boolean }
      advance_order_status: { Args: { p_order_id: string; p_status: OrderStatus }; Returns: undefined }
      find_order_for_handoff: { Args: { p_cart_id: string; p_code: string }; Returns: Json }
      mark_here: { Args: { p_token: string }; Returns: undefined }
      mark_picked_up: { Args: { p_order_id: string }; Returns: undefined }
      move_order_late: { Args: { p_token: string }; Returns: { new_window_id: string; starts_at: string }[] }
      get_order_by_token: { Args: { p_token: string }; Returns: Json }
      submit_rating: {
        Args: { p_token: string; p_order_item_id: string; p_stars: number; p_tags?: string[]; p_comment?: string }
        Returns: undefined
      }
      set_cart_surge: { Args: { p_cart_id: string; p_on: boolean }; Returns: undefined }
      set_walkup_line: { Args: { p_cart_id: string; p_delta: number }; Returns: number }
      set_item_sold_out: { Args: { p_cart_id: string; p_item_id: string; p_on: boolean }; Returns: undefined }
      open_cart: { Args: { p_cart_id: string }; Returns: undefined }
      close_cart: { Args: { p_cart_id: string }; Returns: undefined }
      generate_windows: { Args: { p_service_day_id: string }; Returns: number }
      app_role: { Args: Record<string, never>; Returns: UserRole }
      is_staff: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: {
      user_role: UserRole
      order_status: OrderStatus
      order_channel: OrderChannel
      payment_method: PaymentMethod
      item_status: ItemStatus
      prep_kind: PrepKind
    }
    CompositeTypes: { [_ in never]: never }
  }
}
