import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/lib/i18n'
import { addSiteComment, deleteSiteComment, listSiteComments, type SiteComment } from '@/lib/siteComments'
import { Reveal } from '@/components/Reveal'

function initials(name: string) {
  return name.trim().slice(0, 2) || '؟'
}

function Avatar({ c }: { c: SiteComment }) {
  if (c.author?.avatar_url) {
    return <img src={c.author.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy/10 text-[15px] font-bold text-navy">
      {initials(c.author?.name ?? '')}
    </div>
  )
}

export function SiteComments() {
  const { t, lang } = useLanguage()
  const { session, profile } = useAuth()
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['site-comments'], queryFn: listSiteComments })

  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const isOwner = profile?.role === 'owner'
  const locale = lang === 'ar' ? 'ar' : 'en-US'

  const addMut = useMutation({
    mutationFn: () => addSiteComment(profile!.id, body),
    onSuccess: () => {
      setBody('')
      setError('')
      void queryClient.invalidateQueries({ queryKey: ['site-comments'] })
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => deleteSiteComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site-comments'] }),
  })

  const submit = () => {
    if (!body.trim()) return
    addMut.mutate()
  }

  const comments = data ?? []

  return (
    <div id="community" className="bg-bg-soft px-4 py-12 md:px-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-2 text-center text-[13px] font-semibold tracking-[2px] text-accent">
            {t('comments.eyebrow')}
          </div>
          <h2 className="font-heading mb-3 text-center text-[26px] font-bold text-navy md:text-[34px]">
            {t('comments.title')}
          </h2>
          <p className="mx-auto mb-9 max-w-2xl text-center text-[15px] leading-8 text-muted">{t('comments.subtitle')}</p>
        </Reveal>

        {/* Add form */}
        <div className="mx-auto mb-10 max-w-2xl">
          {session && profile ? (
            <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_4px_16px_-8px_rgba(11,31,58,.15)]">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                maxLength={600}
                placeholder={t('comments.placeholder')}
                className="w-full resize-y rounded-lg border border-border px-3.5 py-2.5 text-[14px] outline-none focus:border-navy"
              />
              {error && <div className="mt-2 text-[13px] text-error">{error}</div>}
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[12px] text-faint">{t('comments.postingAs', { name: profile.name })}</span>
                <button
                  onClick={submit}
                  disabled={!body.trim() || addMut.isPending}
                  className="rounded-lg bg-navy px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
                >
                  {addMut.isPending ? t('comments.posting') : t('comments.post')}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white p-6 text-center">
              <p className="mb-3 text-[14px] text-muted">{t('comments.loginPrompt')}</p>
              <Link
                to="/login"
                className="inline-block rounded-lg bg-navy px-5 py-2.5 text-[13px] font-semibold text-white no-underline hover:bg-navy-hover"
              >
                {t('nav.login')}
              </Link>
            </div>
          )}
        </div>

        {/* Wall */}
        {comments.length === 0 ? (
          <p className="text-center text-[14px] text-faint">{t('comments.empty')}</p>
        ) : (
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
            {comments.map((c) => {
              const canDelete = isOwner || c.author_id === profile?.id
              return (
                <div key={c.id} className="rounded-2xl border border-border bg-white p-5 shadow-[0_4px_16px_-8px_rgba(11,31,58,.12)]">
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar c={c} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-navy">{c.author?.name ?? '—'}</div>
                      <div className="text-[11.5px] text-faint">
                        {new Date(c.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => delMut.mutate(c.id)}
                        title={t('comments.delete')}
                        className="shrink-0 rounded-md px-2 py-1 text-[13px] text-faint hover:bg-error-bg hover:text-error"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-[14px] leading-7 text-muted-2">{c.body}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
