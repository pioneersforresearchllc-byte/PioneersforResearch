import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n'
import { deleteArticle, listAllArticles, type ArticleListItem } from '@/lib/articles'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'

/** Owner moderation view: every article on the platform, with delete. RLS
 * (articles_delete_author) already lets a verified owner remove any article. */
export function OwnerArticlesPage() {
  const { t, lang } = useLanguage()
  const qc = useQueryClient()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const { data: articles, isLoading } = useQuery({ queryKey: ['owner-articles'], queryFn: listAllArticles })

  const del = useMutation({
    mutationFn: (id: string) => deleteArticle(id),
    onSuccess: () => {
      setConfirmId(null)
      void qc.invalidateQueries({ queryKey: ['owner-articles'] })
    },
  })

  const items = articles ?? []
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="mb-1.5 font-heading text-xl font-bold text-navy">{t('adminArticles.title')}</div>
      <div className="mb-5 text-[13.5px] text-muted">{t('adminArticles.subtitle')}</div>

      {isLoading && <LoadingState />}
      {articles && items.length === 0 && <EmptyState title={t('adminArticles.empty')} />}

      <div className="flex flex-col gap-3">
        {items.map((a: ArticleListItem) => (
          <div key={a.id} className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 elev-1">
            {a.image_url ? (
              <img src={a.image_url} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-bg-soft text-[22px]">📝</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-navy">{lang === 'en' ? a.title_en || a.title : a.title}</div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-muted">
                <span>{t('adminArticles.by')}: {a.authorName || '—'}</span>
                <span>· {fmtDate(a.created_at)}</span>
                <span>· ♥ {a.likes_count}</span>
                <span>· 💬 {a.commentsCount}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link to={`/article/${a.id}`} target="_blank" className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] text-navy no-underline hover:border-navy">
                {t('adminArticles.view')}
              </Link>
              {confirmId === a.id ? (
                <>
                  <Button variant="danger" size="sm" loading={del.isPending} onClick={() => del.mutate(a.id)}>
                    {t('adminArticles.confirmDelete')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                    {t('adminServices.cancel')}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirmId(a.id)} className="!border-error/40 !text-error hover:!bg-error/5">
                  {t('adminArticles.delete')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
