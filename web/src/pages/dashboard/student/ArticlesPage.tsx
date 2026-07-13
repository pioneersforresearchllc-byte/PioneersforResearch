import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listAllArticles } from '@/lib/articles'

export function StudentArticlesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['all-articles'], queryFn: listAllArticles })

  return (
    <div>
      <div className="mb-5 font-heading text-xl font-bold text-navy">المقالات</div>

      {isLoading && <div className="text-muted">جارِ التحميل...</div>}
      {data && data.length === 0 && <div className="text-muted">لا توجد مقالات منشورة بعد.</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(data ?? []).map((a) => (
          <Link
            key={a.id}
            to={`/article/${a.id}`}
            className="flex flex-col rounded-xl border border-border bg-white p-5 no-underline hover:border-navy"
          >
            {a.image_url && <img src={a.image_url} className="mb-3 block aspect-[1.8] w-full rounded-lg object-cover" alt="" />}
            <div className="mb-1.5 text-[12.5px] font-semibold text-accent">بقلم {a.authorName}</div>
            <div className="mb-2 text-[15px] font-semibold text-navy">{a.title}</div>
            <p className="mb-3 flex-1 text-[13px] leading-7 text-muted">{a.content.slice(0, 140)}</p>
            <div className="flex gap-3 text-[12px] text-faint">
              <span>{a.likes_count} إعجاب</span>
              <span>{a.commentsCount} تعليق</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
