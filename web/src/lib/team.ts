import { supabase } from '@/lib/supabase'

export interface TeamMember {
  id: string
  name: string
  title_ar: string | null
  title_en: string | null
  bio_ar: string | null
  bio_en: string | null
  sort_order: number
  active: boolean
}

export type TeamMemberInput = Omit<TeamMember, 'id'>

/** Active members for the public homepage, in display order. */
export async function listTeamMembers(): Promise<TeamMember[]> {
  const { data } = await supabase.from('team_members').select('*').eq('active', true).order('sort_order')
  return (data as TeamMember[]) ?? []
}

/** Every member (active or not) for the owner editor. */
export async function listAllTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase.from('team_members').select('*').order('sort_order')
  if (error) throw error
  return (data as TeamMember[]) ?? []
}

export async function createTeamMember(values: TeamMemberInput) {
  const { error } = await supabase.from('team_members').insert(values)
  if (error) throw error
}

export async function updateTeamMember(id: string, values: Partial<TeamMemberInput>) {
  const { error } = await supabase.from('team_members').update(values).eq('id', id)
  if (error) throw error
}

export async function deleteTeamMember(id: string) {
  const { error } = await supabase.from('team_members').delete().eq('id', id)
  if (error) throw error
}
