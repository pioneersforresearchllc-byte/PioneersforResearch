import { useEffect, useState } from 'react'
import type { UserRole } from '@/types/profile'
import type { ChatProfile } from '@/types/chat'
import { Avatar } from '@/pages/dashboard/chat/Avatar'
import { XIcon } from '@/pages/dashboard/chat/Icons'
import { createGroup, findOrCreateDm, searchEligibleUsers } from '@/lib/chat'

interface NewConversationModalProps {
  myUserId: string
  myRole: UserRole
  onClose: () => void
  onCreated: (conversationId: string) => void
}

export function NewConversationModal({ myUserId, myRole, onClose, onCreated }: NewConversationModalProps) {
  const canCreateGroup = myRole === 'teacher' || myRole === 'owner'
  const [mode, setMode] = useState<'dm' | 'group'>('dm')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChatProfile[]>([])
  const [selected, setSelected] = useState<ChatProfile[]>([])
  const [groupName, setGroupName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    searchEligibleUsers(myRole, query).then((r) => {
      if (active) setResults(r)
    })
    return () => {
      active = false
    }
  }, [myRole, query])

  const toggleSelect = (u: ChatProfile) => {
    setSelected((prev) => (prev.some((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u]))
  }

  const startDm = async (u: ChatProfile) => {
    setBusy(true)
    try {
      const id = await findOrCreateDm(myUserId, u.id)
      onCreated(id)
    } finally {
      setBusy(false)
    }
  }

  const submitGroup = async () => {
    if (!groupName.trim() || selected.length === 0) return
    setBusy(true)
    try {
      const id = await createGroup(myUserId, groupName.trim(), selected.map((u) => u.id))
      onCreated(id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-[420px] flex-col rounded-xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="font-heading text-lg font-bold text-navy">محادثة جديدة</div>
          <button onClick={onClose} className="p-1 text-muted hover:text-navy">
            <XIcon />
          </button>
        </div>

        {canCreateGroup && (
          <div className="mb-4 flex rounded-lg bg-bg-soft p-1">
            <button
              onClick={() => setMode('dm')}
              className={`flex-1 rounded-md border-none py-2 text-[13px] font-semibold ${
                mode === 'dm' ? 'bg-navy text-white' : 'bg-transparent text-navy'
              }`}
            >
              رسالة مباشرة
            </button>
            <button
              onClick={() => setMode('group')}
              className={`flex-1 rounded-md border-none py-2 text-[13px] font-semibold ${
                mode === 'group' ? 'bg-navy text-white' : 'bg-transparent text-navy'
              }`}
            >
              إنشاء قروب
            </button>
          </div>
        )}

        {mode === 'group' && (
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="اسم القروب"
            className="mb-3 w-full box-border rounded-md border border-border px-3 py-2.5 text-[14px]"
          />
        )}

        {mode === 'group' && selected.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selected.map((u) => (
              <span
                key={u.id}
                onClick={() => toggleSelect(u)}
                className="flex cursor-pointer items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-[12px] text-white"
              >
                {u.name} <XIcon />
              </span>
            ))}
          </div>
        )}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو اسم المستخدم..."
          className="mb-3 w-full box-border rounded-md border border-border px-3 py-2.5 text-[14px]"
        />

        <div className="flex-1 overflow-y-auto">
          {results.length === 0 && <div className="p-3 text-center text-[13px] text-muted">لا نتائج</div>}
          {results.map((u) => {
            const isSelected = selected.some((p) => p.id === u.id)
            return (
              <button
                key={u.id}
                disabled={busy}
                onClick={() => (mode === 'dm' ? void startDm(u) : toggleSelect(u))}
                className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-right hover:bg-bg-soft ${
                  isSelected ? 'bg-bg-soft' : ''
                }`}
              >
                <Avatar name={u.name} avatarUrl={u.avatar_url} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-navy">{u.name}</div>
                  <div className="truncate text-[12px] text-muted">@{u.username}</div>
                </div>
                {mode === 'group' && isSelected && <span className="shrink-0 text-navy">✓</span>}
              </button>
            )
          })}
        </div>

        {mode === 'group' && (
          <button
            onClick={() => void submitGroup()}
            disabled={busy || !groupName.trim() || selected.length === 0}
            className="mt-3 rounded-md bg-navy py-2.5 text-[14px] font-semibold text-white hover:bg-navy-hover disabled:opacity-40"
          >
            إنشاء القروب
          </button>
        )}
      </div>
    </div>
  )
}
