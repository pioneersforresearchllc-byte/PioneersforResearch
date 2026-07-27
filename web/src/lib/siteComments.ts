import { supabase } from '@/lib/supabase'

export interface SiteComment {
  id: string
  body: string
  created_at: string
  author_id: string
  author: { name: string; avatar_url: string | null; role: string } | null
}

interface Row {
  id: string
  body: string
  created_at: string
  author_id: string
  author: { name: string; avatar_url: string | null; role: string } | null
}

/** The public comments wall, newest first. Readable by anyone. */
export async function listSiteComments(): Promise<SiteComment[]> {
  const { data, error } = await supabase
    .from('site_comments')
    .select('id, body, created_at, author_id, author:profiles!site_comments_author_id_fkey(name, avatar_url, role)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return ((data ?? []) as unknown as Row[]).map((r) => ({ ...r }))
}

export async function addSiteComment(authorId: string, body: string): Promise<void> {
  const { error } = await supabase.from('site_comments').insert({ author_id: authorId, body: body.trim() })
  if (error) throw error
}

/** Deletes a comment. RLS allows this only for the author or a verified owner. */
export async function deleteSiteComment(id: string): Promise<void> {
  const { error } = await supabase.from('site_comments').delete().eq('id', id)
  if (error) throw error
}
