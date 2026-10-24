import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Database } from '@/types/db'

type Tables = Database['public']['Tables']
export type TableName = keyof Tables & string
export type ChangePayload<T extends TableName> = RealtimePostgresChangesPayload<Tables[T]['Row']>

/**
 * Listen to inserts, updates and deletes on a table. `filter` is a PostgREST filter such as
 * `cart_id=eq.<uuid>`. Returns the unsubscribe function (call it on unmount).
 */
export function subscribeTable<T extends TableName>(
  table: T,
  filter: string | undefined,
  cb: (payload: ChangePayload<T>) => void,
): () => void {
  const channel = supabase
    .channel(`rt:${table}:${filter ?? '*'}:${crypto.randomUUID()}`)
    .on(
      'postgres_changes' as never,
      { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
      cb as (payload: unknown) => void,
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
