import { supabase } from '@/lib/supabase'
import { translateTexts } from '@/lib/translate'

export interface Article {
  id: string
  author_id: string
  title: string
  content: string
  title_en: string | null
  content_en: string | null
  image_url: string | null
  likes_count: number
  created_at: string
}

export interface ArticleListItem extends Article {
  authorName: string
  commentsCount: number
}

export async function listAllArticles(): Promise<ArticleListItem[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*, author:profiles!articles_author_id_fkey(name), article_comments(count)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((a) => ({
    ...a,
    authorName: (a.author as unknown as { name: string } | null)?.name ?? '',
    commentsCount: (a.article_comments as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }))
}

export async function listMyArticles(authorId: string): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function uploadArticleImage(file: File): Promise<string> {
  const path = `${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('article-images').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('article-images').getPublicUrl(path)
  return data.publicUrl
}

// Fire-and-forget — called right after create/update so English content
// appears within a few seconds without blocking the save.
async function translateArticle(id: string, title: string, content: string) {
  const translations = await translateTexts([title, content])
  if (!translations) return
  await supabase.from('articles').update({ title_en: translations[0], content_en: translations[1] }).eq('id', id)
}

export async function createArticle(authorId: string, title: string, content: string, imageUrl: string | null) {
  const { data, error } = await supabase
    .from('articles')
    .insert({ author_id: authorId, title, content, image_url: imageUrl })
    .select('id')
    .single()
  if (error) throw error
  void translateArticle(data.id, title, content)
}

export async function updateArticle(id: string, title: string, content: string, imageUrl: string | null) {
  const { error } = await supabase.from('articles').update({ title, content, image_url: imageUrl }).eq('id', id)
  if (error) throw error
  void translateArticle(id, title, content)
}

export async function deleteArticle(id: string) {
  const { error } = await supabase.from('articles').delete().eq('id', id)
  if (error) throw error
}
