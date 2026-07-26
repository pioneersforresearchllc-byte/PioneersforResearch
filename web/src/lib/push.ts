import { supabase } from '@/lib/supabase'

// The VAPID PUBLIC key is not a secret — it's handed to every browser as the
// applicationServerKey. Hardcoded so the app works out of the box; override
// with VITE_VAPID_PUBLIC_KEY if the key is ever rotated. The matching PRIVATE
// key lives only in the send-push edge function's Supabase secrets.
const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
  'BARWGwQjMoR3aaUov5vw7-aO7YaPqMKAvNk3vlqp35CwCPetwRcQLLlUhd3P1k-gt4VKMnBH7aeWUz4zTGsFgB8'

export type PushState = 'unsupported' | 'default' | 'denied' | 'subscribed'

export type PushEvent = 'chat' | 'grade' | 'certificate' | 'service_request'

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  // Back it with a concrete ArrayBuffer so it satisfies BufferSource (the
  // applicationServerKey type) under the newer generic Uint8Array lib types.
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (sub && Notification.permission === 'granted') return 'subscribed'
  return 'default'
}

/** Request permission, subscribe this device, and persist the subscription so
 * the backend can reach it. Returns the resulting state. */
export async function enablePush(userId: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default'

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = sub.toJSON()
  const keys = json.keys ?? {}
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
  return 'subscribed'
}

/** Turn off notifications on this device (unsubscribe + forget). */
export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe().catch(() => {})
}

/** Fire-and-forget: ask the backend to notify about an event. Deliberately
 * swallows all errors — a failed push must never break the underlying action
 * (sending a message, grading, issuing a certificate, …). */
export function triggerPush(type: PushEvent, id: string): void {
  void supabase.functions.invoke('send-push', { body: { type, id } }).catch(() => {})
}
