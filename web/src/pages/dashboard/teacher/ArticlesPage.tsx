import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import {
  createArticle,
  deleteArticle,
  listMyArticles,
  updateArticle,
  uploadArticleImage,
  type Article,
} from '@/lib/articles'

function ArticleForm({
  authorId,
  article,
  onClose,
  onSaved,
}: {
  authorId: string
  article: Article | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(article?.title ?? '')
  const [content, setContent] = useState(article?.content ?? '')
  const [imageUrl, setImageUrl] = useState(article?.image_url ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleImage = async (file: File) => {
    setBusy(true)
    try {
      setImageUrl(await uploadArticleImage(file))
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      setError('العنوان والمحتوى مطلوبان')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (article) {
        await updateArticle(article.id, title.trim(), content.trim(), imageUrl)
      } else {
        await createArticle(authorId, title.trim(), content.trim(), imageUrl)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 font-heading text-lg font-bold text-navy">{article ? 'تعديل المقال' : 'مقال جديد'}</div>
        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان المقال"
            className="rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="محتوى المقال"
            rows={6}
            className="resize-y rounded-md border border-border px-3.5 py-2.5 text-[14px]"
          />
          <div className="flex items-center gap-3">
            {imageUrl && <img src={imageUrl} className="h-14 w-24 rounded object-cover" alt="" />}
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleImage(e.target.files[0])} />
          </div>
          {error && <div className="text-[13px] text-error">{error}</div>}
          <div className="mt-1 flex gap-2.5">
            <button
              onClick={() => void save()}
              disabled={busy}
              className="flex-1 rounded-md bg-navy py-2.75 text-[14px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
            >
              {article ? 'حفظ التعديلات' : 'نشر المقال'}
            </button>
            <button onClick={onClose} className="rounded-md border border-border px-5 py-2.75 text-[14px] text-navy">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TeacherArticlesPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Article | null | 'new'>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-articles', profile?.id],
    enabled: !!profile,
    queryFn: () => listMyArticles(profile!.id),
  })

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['my-articles', profile?.id] })

  const remove = async (id: string) => {
    if (!confirm('حذف هذا المقال نهائيًا؟')) return
    await deleteArticle(id)
    refresh()
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="font-heading text-xl font-bold text-navy">مقالاتي</div>
        <button
          onClick={() => setEditing('new')}
          className="rounded-md bg-navy px-4.5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-navy-hover"
        >
          + مقال جديد
        </button>
      </div>

      {isLoading && <div className="text-muted">جارِ التحميل...</div>}
      {data && data.length === 0 && <div className="text-muted">لسه ما نشرت أي مقال.</div>}

      <div className="flex flex-col gap-2.5">
        {(data ?? []).map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-4">
            <div>
              <div className="text-[14px] font-semibold text-navy">{a.title}</div>
              <div className="text-[12.5px] text-muted">{a.likes_count} إعجاب</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(a)}
                className="rounded-md border border-border px-3.5 py-1.5 text-[12.5px] text-navy hover:border-navy"
              >
                تعديل
              </button>
              <button
                onClick={() => void remove(a.id)}
                className="rounded-md border border-border px-3.5 py-1.5 text-[12.5px] text-error hover:border-error"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && profile && (
        <ArticleForm
          authorId={profile.id}
          article={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
