import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/profile'

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) {
    console.error('Failed to load profile', error)
    return null
  }
  return data as Profile | null
}
