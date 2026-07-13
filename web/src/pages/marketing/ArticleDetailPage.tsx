import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'

interface ArticleDetail {
  id: string
  title: string
  content: string
  title_en: string | null
  content_en: string | null
  image_url: string | null
  likes_count: number
  author_id: string
  author_name: string
}

interface CommentRow {
  id: string
  text: string
  author_name: string
}

function useArticle(id: string | undefined) {
  return useQuery({
    queryKey: ['article-detail', id],
    enabled: !!id,
    queryFn: async (): Promise<ArticleDetail | null> => {
      const { data, error } = await supabase
        .from('articles')
        .select(
          'id, title, content, title_en, content_en, image_url, likes_count, author_id, author:profiles!articles_author_id_fkey(name)',
        )
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        id: data.id,
        title: data.title,
        content: data.content,
        title_en: data.title_en,
        content_en: data.content_en,
        image_url: data.image_url,
        likes_count: data.likes_count,
        author_id: data.author_id,
        author_name: (data.author as unknown as { name: string } | null)?.name ?? '',
      }
    },
  })
}

function useComments(id: string | undefined) {
  return useQuery({
    queryKey: ['article-comments', id],
    enabled: !!id,
    queryFn: async (): Promise<CommentRow[]> => {
      const { data, error } = await supabase
        .from('article_comments')
        .select('id, text, author:profiles!article_comments_author_id_fkey(name)')
        .eq('article_id', id!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []).map((c) => ({
        id: c.id,
        text: c.text,
        author_name: (c.author as unknown as { name: string } | null)?.name ?? '',
      }))
    },
  })
}

function useMyLike(id: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['article-my-like', id, userId],
    enabled: !!id && !!userId,
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from('article_likes')
        .select('article_id')
        .eq('article_id', id!)
        .eq('user_id', userId!)
        .maybeSingle()
      return !!data
    },
  })
}

function useLikerNames(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['article-likers', id],
    enabled: !!id && enabled,
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase
        .from('article_likes')
        .select('user:profiles!article_likes_user_id_fkey(name)')
        .eq('article_id', id!)
      return (data ?? []).map((r) => (r.user as unknown as { name: string } | null)?.name ?? '').filter(Boolean)
    },
  })
}

export function ArticleDetailPage() {
  const { id } = useParams()
  const { session, profile } = useAuth()
  const { t, lang } = useLanguage()
  const queryClient = useQueryClient()
  const { data: article, isLoading } = useArticle(id)
  const { data: comments } = useComments(id)
  const { data: iLiked } = useMyLike(id, profile?.id)
  const isAuthor = !!article && profile?.id === article.author_id
  const { data: likerNames } = useLikerNames(id, isAuthor)
  const [commentDraft, setCommentDraft] = useState('')

  const canInteract = !!session

  const toggleLike = async () => {
    if (!session || !profile || !id) return
    if (iLiked) {
      await supabase.from('article_likes').delete().eq('article_id', id).eq('user_id', profile.id)
    } else {
      await supabase.from('article_likes').insert({ article_id: id, user_id: profile.id })
    }
    queryClient.invalidateQueries({ queryKey: ['article-my-like', id, profile.id] })
    queryClient.invalidateQueries({ queryKey: ['article-detail', id] })
    queryClient.invalidateQueries({ queryKey: ['article-likers', id] })
  }

  const addComment = async (e: FormEvent) => {
    e.preventDefault()
    if (!session || !profile || !id || !commentDraft.trim()) return
    await supabase.from('article_comments').insert({ article_id: id, author_id: profile.id, text: commentDraft.trim() })
    setCommentDraft('')
    queryClient.invalidateQueries({ queryKey: ['article-comments', id] })
  }

  if (isLoading) return <div className="px-16 py-20 text-center text-muted">...</div>
  if (!article) {
    return (
      <div className="px-16 py-20 text-center">
        <div className="mb-4 text-muted">{t('article.notFound')}</div>
        <Link to="/" className="text-navy no-underline">
          {t('course.backHome')}
        </Link>
      </div>
    )
  }

  return (
    <div className="px-16 py-20">
      <Link to="/#resources" className="mb-5 inline-block text-[13px] text-muted no-underline">
        {t('article.back')}
      </Link>
      <div className="mx-auto max-w-170 overflow-hidden rounded-[10px] border border-border bg-white">
        {article.image_url && (
          <img src={article.image_url} className="block aspect-[1.8] w-full object-cover" alt="" />
        )}
        <div className="p-7">
          <h2 className="font-heading mb-2 text-2xl">{lang === 'en' ? article.title_en || article.title : article.title}</h2>
          <div className="mb-4.5 text-[13px] text-accent">{t('article.byAuthor', { name: article.author_name })}</div>
          <p className="mb-5.5 whitespace-pre-wrap text-[15px] leading-[2] text-muted-2">
            {lang === 'en' ? article.content_en || article.content : article.content}
          </p>

          {canInteract ? (
            <div className="flex gap-2.5 border-t border-border-2 pt-4.5">
              <button
                onClick={() => void toggleLike()}
                className="rounded-md border border-border px-4.5 py-2 text-[13.5px] text-navy hover:border-navy"
              >
                {iLiked ? t('article.unlike') : t('article.like')} ({article.likes_count})
              </button>
            </div>
          ) : (
            <div className="border-t border-border-2 pt-4.5 text-[13.5px] text-muted">
              {t('article.loginPromptPrefix', { likes: String(article.likes_count) })}{' '}
              <Link to="/login" className="font-semibold text-navy no-underline">
                {t('article.loginToInteract')}
              </Link>{' '}
              {t('article.loginSuffix')}
            </div>
          )}

          {isAuthor && likerNames && likerNames.length > 0 && (
            <div className="mt-3.5 text-[12.5px] text-faint">
              {t('article.likedBy', { names: likerNames.join('، ') })}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-170">
        <div className="mb-3.5 text-[15px] font-semibold">{t('article.commentsTitle')}</div>
        {(comments ?? []).map((c) => (
          <div key={c.id} className="mb-2.5 rounded-[10px] border border-border bg-white px-4.5 py-3.5">
            <div className="mb-1 text-[13.5px] font-semibold">{c.author_name}</div>
            <div className="text-sm leading-[1.7] text-muted-2">{c.text}</div>
          </div>
        ))}
        {canInteract && (
          <form onSubmit={(e) => void addComment(e)} className="mt-2 flex gap-2.5">
            <input
              type="text"
              placeholder={t('article.commentPh')}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              className="flex-1 rounded-lg border border-border px-3.5 py-2.75 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-navy px-5.5 py-2.75 text-[13.5px] text-white hover:bg-navy-hover"
            >
              {t('article.send')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
