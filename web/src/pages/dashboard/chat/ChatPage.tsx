import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import type { Message } from '@/types/chat'
import { Avatar } from '@/pages/dashboard/chat/Avatar'
import { UsersIcon } from '@/pages/dashboard/chat/Icons'
import { ConversationList } from '@/pages/dashboard/chat/ConversationList'
import { MessageThread } from '@/pages/dashboard/chat/MessageThread'
import { MessageComposer } from '@/pages/dashboard/chat/MessageComposer'
import { NewConversationModal } from '@/pages/dashboard/chat/NewConversationModal'
import { GroupInfoPanel } from '@/pages/dashboard/chat/GroupInfoPanel'
import {
  listConversations,
  listMessages,
  markConversationRead,
  subscribeToConversationMessages,
  subscribeToMyConversations,
} from '@/lib/chat'

export function ChatPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)

  const myUserId = profile?.id ?? ''
  const myRole = profile?.role ?? 'student'

  const convQuery = useQuery({
    queryKey: ['conversations', myUserId],
    queryFn: () => listConversations(myUserId),
    enabled: !!myUserId,
  })

  const conversations = useMemo(() => convQuery.data ?? [], [convQuery.data])
  const activeConversation = conversations.find((c) => c.id === activeId) ?? null

  useEffect(() => {
    if (!myUserId) return
    return subscribeToMyConversations(myUserId, () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', myUserId] })
    })
  }, [myUserId, queryClient])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    let active = true
    listMessages(activeId).then((m) => {
      if (active) setMessages(m)
    })
    void markConversationRead(activeId, myUserId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', myUserId] })
    })
    setReplyTo(null)
    setShowGroupInfo(false)

    const unsubscribe = subscribeToConversationMessages(
      activeId,
      (m) => {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
        void markConversationRead(activeId, myUserId)
        void queryClient.invalidateQueries({ queryKey: ['conversations', myUserId] })
      },
      (m) => {
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)))
        void queryClient.invalidateQueries({ queryKey: ['conversations', myUserId] })
      },
    )
    return () => {
      active = false
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, myUserId])

  const refreshActiveMessages = () => {
    if (!activeId) return
    listMessages(activeId).then(setMessages)
  }

  if (!profile) return null

  return (
    <div className="flex h-[calc(100vh-100px)] overflow-hidden rounded-xl border border-border bg-white">
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onStartNew={() => setShowNew(true)}
        loading={convQuery.isLoading}
      />

      {!activeConversation && (
        <div className="flex flex-1 items-center justify-center text-[14px] text-muted">اختر محادثة أو ابدأ محادثة جديدة</div>
      )}

      {activeConversation && (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              {activeConversation.type === 'group' ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1f5] text-navy">
                  <UsersIcon />
                </div>
              ) : (
                <Avatar
                  name={activeConversation.otherMember?.name ?? '?'}
                  avatarUrl={activeConversation.otherMember?.avatar_url ?? null}
                />
              )}
              <div>
                <div className="text-[14.5px] font-semibold text-navy">
                  {activeConversation.type === 'group' ? activeConversation.name : activeConversation.otherMember?.name}
                </div>
                {activeConversation.type === 'group' && (
                  <div className="text-[12px] text-muted">{activeConversation.members.length} أعضاء</div>
                )}
              </div>
            </div>
            {activeConversation.type === 'group' && (
              <button
                onClick={() => setShowGroupInfo((v) => !v)}
                className="rounded-md border border-border px-3 py-1.5 text-[12.5px] text-navy hover:border-navy"
              >
                معلومات القروب
              </button>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col">
              <MessageThread
                messages={messages}
                myUserId={myUserId}
                isGroup={activeConversation.type === 'group'}
                onReply={setReplyTo}
                onChanged={refreshActiveMessages}
              />
              <MessageComposer
                conversationId={activeConversation.id}
                myUserId={myUserId}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                onSent={refreshActiveMessages}
              />
            </div>
            {showGroupInfo && activeConversation.type === 'group' && (
              <GroupInfoPanel
                conversation={activeConversation}
                myUserId={myUserId}
                myRole={myRole}
                onClose={() => setShowGroupInfo(false)}
                onChanged={() => void queryClient.invalidateQueries({ queryKey: ['conversations', myUserId] })}
              />
            )}
          </div>
        </div>
      )}

      {showNew && (
        <NewConversationModal
          myUserId={myUserId}
          myRole={myRole}
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false)
            setActiveId(id)
            void queryClient.invalidateQueries({ queryKey: ['conversations', myUserId] })
          }}
        />
      )}
    </div>
  )
}
