import { useEffect, useState } from 'react'
import type { ConversationSummary } from '@/types/chat'
import type { UserRole } from '@/types/profile'
import { Avatar } from '@/pages/dashboard/chat/Avatar'
import { XIcon } from '@/pages/dashboard/chat/Icons'
import {
  addGroupMember,
  approveJoinRequest,
  denyJoinRequest,
  listJoinRequests,
  removeGroupMember,
  searchEligibleUsers,
} from '@/lib/chat'
import type { ChatProfile, JoinRequest } from '@/types/chat'

interface GroupInfoPanelProps {
  conversation: ConversationSummary
  myUserId: string
  myRole: UserRole
  onClose: () => void
  onChanged: () => void
}

export function GroupInfoPanel({ conversation, myUserId, myRole, onClose, onChanged }: GroupInfoPanelProps) {
  const isAdmin = conversation.isAdmin
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState<ChatProfile[]>([])
  const [permissionError, setPermissionError] = useState('')

  const refreshRequests = () => {
    if (isAdmin) listJoinRequests(conversation.id).then(setRequests)
  }

  useEffect(() => {
    refreshRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, isAdmin])

  useEffect(() => {
    if (!isAdmin || !addQuery.trim()) {
      setAddResults([])
      return
    }
    let active = true
    searchEligibleUsers(myRole, addQuery).then((r) => {
      if (active) setAddResults(r.filter((u) => !conversation.members.some((m) => m.user_id === u.id)))
    })
    return () => {
      active = false
    }
  }, [addQuery, isAdmin, myRole, conversation.members])

  const handleApprove = async (req: JoinRequest) => {
    if (!isAdmin) {
      setPermissionError('ليس لديك صلاحية في القبول — يجب أن يوافق أحد المشرفين على طلب الانضمام.')
      return
    }
    await approveJoinRequest(req)
    refreshRequests()
    onChanged()
  }

  const handleDeny = async (req: JoinRequest) => {
    if (!isAdmin) {
      setPermissionError('ليس لديك صلاحية في القبول — يجب أن يوافق أحد المشرفين على طلب الانضمام.')
      return
    }
    await denyJoinRequest(req.id)
    refreshRequests()
  }

  const handleAdd = async (u: ChatProfile) => {
    await addGroupMember(conversation.id, u.id)
    setAddQuery('')
    setAddResults([])
    onChanged()
  }

  const handleRemove = async (userId: string) => {
    await removeGroupMember(conversation.id, userId)
    onChanged()
  }

  return (
    <div className="flex w-[300px] shrink-0 flex-col border-r border-border bg-white">
      <div className="flex items-center justify-between border-b border-border p-3.5">
        <div className="font-heading text-[15px] font-bold text-navy">معلومات القروب</div>
        <button onClick={onClose} className="p-1 text-muted hover:text-navy">
          <XIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5">
        {permissionError && (
          <div className="mb-3 rounded-md bg-error-bg px-3 py-2 text-[12.5px] text-error">{permissionError}</div>
        )}

        {isAdmin && (
          <div className="mb-4">
            <div className="mb-1.5 text-[13px] font-semibold text-navy">إضافة عضو</div>
            <input
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              placeholder="ابحث بالاسم أو اسم المستخدم..."
              className="w-full box-border rounded-md border border-border px-3 py-2 text-[13px]"
            />
            {addResults.map((u) => (
              <button
                key={u.id}
                onClick={() => void handleAdd(u)}
                className="mt-1.5 flex w-full items-center gap-2 rounded-md p-2 text-right hover:bg-bg-soft"
              >
                <Avatar name={u.name} avatarUrl={u.avatar_url} size={28} />
                <span className="truncate text-[13px]">{u.name}</span>
              </button>
            ))}
          </div>
        )}

        {isAdmin && requests.length > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 text-[13px] font-semibold text-navy">طلبات الانضمام</div>
            {requests.map((r) => (
              <div key={r.id} className="mb-1.5 flex items-center gap-2 rounded-md bg-bg-soft p-2">
                <Avatar name={r.profile.name} avatarUrl={r.profile.avatar_url} size={28} />
                <span className="min-w-0 flex-1 truncate text-[13px]">{r.profile.name}</span>
                <button onClick={() => void handleApprove(r)} className="shrink-0 rounded-full bg-success p-1.5 text-white">
                  ✓
                </button>
                <button onClick={() => void handleDeny(r)} className="shrink-0 rounded-full bg-error p-1.5 text-white">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-navy">الأعضاء ({conversation.members.length})</div>
          {conversation.members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-2 rounded-md p-2 hover:bg-bg-soft">
              <Avatar name={m.profile.name} avatarUrl={m.profile.avatar_url} size={30} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-navy">{m.profile.name}</div>
                {m.is_admin && <div className="text-[11px] text-gold">مشرف</div>}
              </div>
              {isAdmin && m.user_id !== myUserId && (
                <button onClick={() => void handleRemove(m.user_id)} className="shrink-0 text-[11.5px] text-error hover:underline">
                  إزالة
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
