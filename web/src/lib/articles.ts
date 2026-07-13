import { supabase } from '@/lib/supabase'

export interface Article {
  id: string
  author_id: string
  title: string
  content: string
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

export async function createArticle(authorId: string, title: string, content: string, imageUrl: string | null) {
  const { error } = await supabase.from('articles').insert({ author_id: authorId, title, content, image_url: imageUrl })
  if (error) throw error
}

export async function updateArticle(id: string, title: string, content: string, imageUrl: string | null) {
  const { error } = await supabase.from('articles').update({ title, content, image_url: imageUrl }).eq('id', id)
  if (error) throw error
}

export async function deleteArticle(id: string) {
  const { error } = await supabase.from('articles').delete().eq('id', id)
  if (error) throw error
}
