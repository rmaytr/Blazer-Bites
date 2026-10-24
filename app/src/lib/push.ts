// Web push. Stub for Slice 0; workstream D implements the subscription and save_push_subscription.

export type PushResult = 'granted' | 'denied' | 'unsupported'

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function enablePush(_opts: { orderToken?: string } = {}): Promise<PushResult> {
  if (!isPushSupported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  // TODO(workstream D): subscribe with VITE_VAPID_PUBLIC_KEY and call save_push_subscription(p_sub, p_token).
  return permission === 'granted' ? 'granted' : 'denied'
}
