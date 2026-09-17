import { supabase } from '@/lib/supabase'

export interface AppNotification {
  id: string
  kind: string
  title: string
  body: string | null
  url: string | null
  read: boolean
  created_at: string
}

/** The most recent notifications for the signed-in user. Returns [] (never
 * throws to the caller's UI) if the table isn't migrated yet. */
export async function listNotifications(limit = 20): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []) as AppNotification[]
}

export async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('read', false)
  if (error) return 0
  return count ?? 0
}

export async function markAllNotificationsRead(): Promise<void> {
  await supabase.rpc('mark_notifications_read')
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

/** Live updates for the bell — fires on any change to the user's own rows. */
export function subscribeToNotifications(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
