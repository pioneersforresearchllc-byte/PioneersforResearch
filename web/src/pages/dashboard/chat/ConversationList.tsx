import { useMemo, useState } from 'react'
import type { ConversationSummary } from '@/types/chat'
import { Avatar } from '@/pages/dashboard/chat/Avatar'
import { UsersIcon } from '@/pages/dashboard/chat/Icons'

interface ConversationListProps {
  conversations: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onStartNew: () => void
  loading: boolean
}

function labelFor(c: ConversationSummary) {
  return c.type === 'group' ? (c.name ?? 'قروب') : (c.otherMember?.name ?? '—')
}

function previewFor(c: ConversationSummary) {
  const m = c.lastMessage
  if (!m) return 'لا رسائل بعد'
  if (m.deleted) return 'تم حذف الرسالة'
  if (m.attachment_kind === 'image') return '📷 صورة'
  if (m.attachment_kind === 'audio') return '🎤 رسالة صوتية'
  if (m.attachment_kind === 'file') return `📎 ${m.attachment_name ?? 'ملف'}`
  return m.text ?? ''
}

const AI_BOT_USERNAME = 'ai-assistant'

export function ConversationList({ conversations, activeId, onSelect, onStartNew, loading }: ConversationListProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim()
    const base = q ? conversations.filter((c) => labelFor(c).includes(q)) : conversations
    // The AI assistant always sits at the top, regardless of last-message
    // recency — it's meant to be reachable without hunting for it.
    return [...base].sort((a, b) => {
      const aIsBot = a.otherMember?.username === AI_BOT_USERNAME ? 1 : 0
      const bIsBot = b.otherMember?.username === AI_BOT_USERNAME ? 1 : 0
      return bIsBot - aIsBot
    })
  }, [conversations, search])

  return (
    <div
      className={`${activeId ? 'hidden' : 'flex'} w-full shrink-0 flex-col border-l border-border md:flex md:w-[300px]`}
    >
      <div className="flex items-center gap-2 border-b border-border p-3.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم..."
          className="w-full box-border rounded-md border border-border px-3 py-2 text-[13.5px]"
        />
        <button
          onClick={onStartNew}
          title="محادثة جديدة"
          className="shrink-0 rounded-md bg-navy px-3 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="p-4 text-center text-[13px] text-muted">جارِ التحميل...</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-4 text-center text-[13px] text-muted">لا توجد محادثات بعد</div>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex w-full items-center gap-3 border-b border-border-2 p-3.5 text-right ${
              activeId === c.id ? 'bg-bg-soft' : 'bg-white hover:bg-bg-soft'
            }`}
          >
            {c.type === 'group' ? (
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#eef1f5] text-navy">
                <UsersIcon />
              </div>
            ) : (
              <Avatar name={c.otherMember?.name ?? '?'} avatarUrl={c.otherMember?.avatar_url ?? null} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[14px] font-semibold text-navy">{labelFor(c)}</span>
              </div>
              <div className="truncate text-[12.5px] text-muted">{previewFor(c)}</div>
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
