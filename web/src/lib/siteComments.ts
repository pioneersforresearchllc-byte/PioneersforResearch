import { supabase } from '@/lib/supabase'

export interface SiteComment {
  id: string
  body: string
  created_at: string
  author_id: string
  rating: number | null
  author: { name: string; avatar_url: string | null; role: string } | null
}

interface Row {
  id: string
  body: string
  created_at: string
  author_id: string
  rating?: number | null
  author: { name: string; avatar_url: string | null; role: string } | null
}

/** The public comments wall, newest first. Readable by anyone. select('*') so
 * a not-yet-migrated `rating` column can never break the query on the live
 * site (it's simply absent until 0048 runs). */
export async function listSiteComments(): Promise<SiteComment[]> {
  const { data, error } = await supabase
    .from('site_comments')
    .select('*, author:profiles!site_comments_author_id_fkey(name, avatar_url, role)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return ((data ?? []) as unknown as Row[]).map((r) => ({ ...r, rating: r.rating ?? null }))
}

export async function addSiteComment(authorId: string, body: string, rating: number | null): Promise<void> {
  const { error } = await supabase
    .from('site_comments')
    .insert({ author_id: authorId, body: body.trim(), rating: rating || null })
  if (error) throw error
}

/** Deletes a comment. RLS allows this only for the author or a verified owner. */
export async function deleteSiteComment(id: string): Promise<void> {
  const { error } = await supabase.from('site_comments').delete().eq('id', id)
  if (error) throw error
}
