import { useMemo, useState } from 'react'
import type { ConversationSummary } from '@/types/chat'
import { Avatar } from '@/pages/dashboard/chat/Avatar'
import { UsersIcon } from '@/pages/dashboard/chat/Icons'
import { useLanguage, type TranslateFn } from '@/lib/i18n'

interface ConversationListProps {
  conversations: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onStartNew: () => void
  loading: boolean
}

function labelFor(c: ConversationSummary, t: TranslateFn) {
  return c.type === 'group' ? (c.name ?? t('chat.group')) : (c.otherMember?.name ?? '—')
}

function previewFor(c: ConversationSummary, t: TranslateFn) {
  const m = c.lastMessage
  if (!m) return t('chat.noMessages')
  if (m.deleted) return t('chat.messageDeleted')
  if (m.attachment_kind === 'image') return t('chat.previewImage')
  if (m.attachment_kind === 'audio') return t('chat.previewAudio')
  if (m.attachment_kind === 'file') return t('chat.previewFile', { name: m.attachment_name ?? t('chat.file') })
  return m.text ?? ''
}

const AI_BOT_USERNAME = 'ai-assistant'

export function ConversationList({ conversations, activeId, onSelect, onStartNew, loading }: ConversationListProps) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim()
    const base = q ? conversations.filter((c) => labelFor(c, t).includes(q)) : conversations
    // The AI assistant always sits at the top, regardless of last-message
    // recency — it's meant to be reachable without hunting for it.
    return [...base].sort((a, b) => {
      const aIsBot = a.otherMember?.username === AI_BOT_USERNAME ? 1 : 0
      const bIsBot = b.otherMember?.username === AI_BOT_USERNAME ? 1 : 0
      return bIsBot - aIsBot
    })
  }, [conversations, search, t])

  return (
    <div
      className={`${activeId ? 'hidden' : 'flex'} w-full shrink-0 flex-col border-l border-border bg-bg-soft/30 md:flex md:w-[320px]`}
    >
      <div className="flex items-center gap-2 border-b border-border bg-white p-3.5">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 flex items-center text-muted ltr:left-3 rtl:right-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('chat.searchByName')}
            className="w-full box-border rounded-lg border border-border bg-bg-soft px-3 py-2 text-[13.5px] transition-colors focus:border-navy focus:bg-white focus:outline-none ltr:pl-9 rtl:pr-9"
          />
        </div>
        <button
          onClick={onStartNew}
          title={t('chat.newConversation')}
          aria-label={t('chat.newConversation')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white transition-colors hover:bg-navy-hover"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="p-4 text-center text-[13px] text-muted">{t('chat.loading')}</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-4 text-center text-[13px] text-muted">{t('chat.noConversations')}</div>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`relative flex w-full items-center gap-3 border-b border-border-2 p-3.5 text-right transition-colors ${
              activeId === c.id ? 'bg-navy/[0.06]' : 'bg-white hover:bg-bg-soft'
            }`}
          >
            {activeId === c.id && (
              <span className="absolute inset-y-2 w-1 rounded-full bg-gold ltr:left-0 rtl:right-0" />
            )}
            {c.type === 'group' ? (
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#eef1f5] text-navy">
                <UsersIcon />
              </div>
            ) : (
              <Avatar name={c.otherMember?.name ?? '?'} avatarUrl={c.otherMember?.avatar_url ?? null} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-[14px] text-navy ${c.unreadCount > 0 ? 'font-bold' : 'font-semibold'}`}>
                  {labelFor(c, t)}
                </span>
              </div>
              <div className={`truncate text-[12.5px] ${c.unreadCount > 0 ? 'font-medium text-navy/75' : 'text-muted'}`}>
                {previewFor(c, t)}
              </div>
            </div>
            {c.unreadCount > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-error px-1.5 text-[11px] font-bold text-white">
                {c.unreadCount > 99 ? '99+' : c.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
