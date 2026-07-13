import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/profile'
import type {
  AttachmentKind,
  ChatProfile,
  ConversationMember,
  ConversationSummary,
  JoinRequest,
  Message,
} from '@/types/chat'

const PROFILE_COLS = 'id, name, username, avatar_url, role'
export const AI_BOT_USERNAME = 'ai-assistant'

/** Who a given role is allowed to search for when starting a new DM or picking group members. */
export function eligibleSearchRoles(myRole: UserRole): UserRole[] {
  if (myRole === 'student') return ['teacher']
  if (myRole === 'teacher') return ['student']
  return ['teacher', 'student'] // owner
}

export async function searchEligibleUsers(myRole: UserRole, query: string): Promise<ChatProfile[]> {
  const roles = eligibleSearchRoles(myRole)
  let q = supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .in('role', roles)
    .eq('status', 'active')
    .limit(20)
  if (query.trim()) {
    q = q.or(`name.ilike.%${query.trim()}%,username.ilike.%${query.trim()}%`)
  }
  const { data, error } = await q
  if (error) throw error
  const results = (data ?? []) as ChatProfile[]

  // The AI assistant is reachable by everyone regardless of the normal
  // role-search restrictions above (it's not a real teacher/student).
  if (!results.some((r) => r.username === AI_BOT_USERNAME)) {
    const { data: bot } = await supabase.from('profiles').select(PROFILE_COLS).eq('username', AI_BOT_USERNAME).maybeSingle()
    if (bot && (!query.trim() || bot.name.includes(query) || bot.username.includes(query))) {
      results.unshift(bot as ChatProfile)
    }
  }
  return results
}

async function membersForConversations(conversationIds: string[]): Promise<ConversationMember[]> {
  if (conversationIds.length === 0) return []
  const { data, error } = await supabase
    .from('conversation_members')
    .select(`conversation_id, user_id, is_admin, joined_at, profile:profiles(${PROFILE_COLS})`)
    .in('conversation_id', conversationIds)
  if (error) throw error
  return (data ?? []).map((row) => ({ ...row, profile: row.profile as unknown as ChatProfile })) as ConversationMember[]
}

export async function listConversations(myUserId: string): Promise<ConversationSummary[]> {
  const { data: myMemberships, error: memErr } = await supabase
    .from('conversation_members')
    .select('conversation_id, is_admin')
    .eq('user_id', myUserId)
  if (memErr) throw memErr
  const ids = (myMemberships ?? []).map((m) => m.conversation_id)
  if (ids.length === 0) return []

  const [{ data: convs, error: convErr }, allMembers, { data: reads, error: readsErr }] = await Promise.all([
    supabase.from('conversations').select('id, type, name, created_by, created_at').in('id', ids),
    membersForConversations(ids),
    supabase.from('conversation_reads').select('conversation_id, last_read_at').eq('user_id', myUserId),
  ])
  if (convErr) throw convErr
  if (readsErr) throw readsErr

  const readMap = new Map((reads ?? []).map((r) => [r.conversation_id, r.last_read_at as string]))
  const adminMap = new Map((myMemberships ?? []).map((m) => [m.conversation_id, m.is_admin]))

  const summaries = await Promise.all(
    (convs ?? []).map(async (c) => {
      const members = allMembers.filter((m) => m.conversation_id === c.id)
      const otherMember =
        c.type === 'dm' ? (members.find((m) => m.user_id !== myUserId)?.profile ?? null) : null

      const { data: lastMsgRows } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
      const lastMessage = (lastMsgRows?.[0] ?? null) as Message | null

      const lastRead = readMap.get(c.id)
      let unreadQuery = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .neq('sender_id', myUserId)
        .eq('deleted', false)
      if (lastRead) unreadQuery = unreadQuery.gt('created_at', lastRead)
      const { count } = await unreadQuery

      return {
        ...c,
        members,
        otherMember,
        lastMessage,
        unreadCount: count ?? 0,
        isAdmin: adminMap.get(c.id) ?? false,
      } as ConversationSummary
    }),
  )

  summaries.sort((a, b) => {
    const at = a.lastMessage?.created_at ?? a.created_at
    const bt = b.lastMessage?.created_at ?? b.created_at
    return bt.localeCompare(at)
  })
  return summaries
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`*, sender:profiles!messages_sender_id_fkey(${PROFILE_COLS})`)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  const rows = (data ?? []) as unknown as Message[]
  const byId = new Map(rows.map((m) => [m.id, m]))
  return rows.map((m) => ({ ...m, replyTo: m.reply_to_message_id ? (byId.get(m.reply_to_message_id) ?? null) : null }))
}

export async function markConversationRead(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('conversation_reads')
    .upsert({ conversation_id: conversationId, user_id: userId, last_read_at: new Date().toISOString() })
  if (error) throw error
}

export async function findOrCreateDm(myUserId: string, otherUserId: string): Promise<string> {
  const { data: mine } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', myUserId)
  const { data: theirs } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', otherUserId)
  const shared = new Set((mine ?? []).map((m) => m.conversation_id))
  const commonIds = (theirs ?? []).map((m) => m.conversation_id).filter((id) => shared.has(id))
  if (commonIds.length > 0) {
    const { data: dm } = await supabase
      .from('conversations')
      .select('id')
      .in('id', commonIds)
      .eq('type', 'dm')
      .maybeSingle()
    if (dm) return dm.id
  }

  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({ type: 'dm', created_by: myUserId })
    .select('id')
    .single()
  if (convErr) throw convErr

  const { error: memErr } = await supabase
    .from('conversation_members')
    .insert([
      { conversation_id: conv.id, user_id: myUserId, is_admin: false },
      { conversation_id: conv.id, user_id: otherUserId, is_admin: false },
    ])
  if (memErr) throw memErr
  return conv.id
}

// Ensures the AI assistant DM exists for this user (creating it silently on
// first call) so it's always pinned in their conversation list instead of
// something they have to search for.
export async function ensureAiBotConversation(myUserId: string): Promise<string | null> {
  const { data: bot } = await supabase.from('profiles').select('id').eq('username', AI_BOT_USERNAME).maybeSingle()
  if (!bot) return null
  return findOrCreateDm(myUserId, bot.id)
}

export async function createGroup(creatorId: string, name: string, memberIds: string[]): Promise<string> {
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({ type: 'group', name, created_by: creatorId })
    .select('id')
    .single()
  if (convErr) throw convErr

  const rows = [
    { conversation_id: conv.id, user_id: creatorId, is_admin: true },
    ...memberIds.filter((id) => id !== creatorId).map((id) => ({ conversation_id: conv.id, user_id: id, is_admin: false })),
  ]
  const { error: memErr } = await supabase.from('conversation_members').insert(rows)
  if (memErr) throw memErr
  return conv.id
}

export async function addGroupMember(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('conversation_members')
    .insert({ conversation_id: conversationId, user_id: userId, is_admin: false })
  if (error) throw error
}

export async function removeGroupMember(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('conversation_members')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function requestToJoinGroup(conversationId: string, userId: string, requestedBy: string) {
  const { error } = await supabase
    .from('conversation_join_requests')
    .insert({ conversation_id: conversationId, user_id: userId, requested_by: requestedBy })
  if (error) throw error
}

export async function listJoinRequests(conversationId: string): Promise<JoinRequest[]> {
  const { data, error } = await supabase
    .from('conversation_join_requests')
    .select(`id, conversation_id, user_id, requested_by, created_at, profile:profiles!conversation_join_requests_user_id_fkey(${PROFILE_COLS})`)
    .eq('conversation_id', conversationId)
  if (error) throw error
  return (data ?? []).map((row) => ({ ...row, profile: row.profile as unknown as ChatProfile })) as JoinRequest[]
}

export async function approveJoinRequest(request: JoinRequest) {
  const { error: addErr } = await supabase
    .from('conversation_members')
    .insert({ conversation_id: request.conversation_id, user_id: request.user_id, is_admin: false })
  if (addErr) throw addErr
  const { error: delErr } = await supabase
    .from('conversation_join_requests')
    .delete()
    .eq('id', request.id)
  if (delErr) throw delErr
}

export async function denyJoinRequest(requestId: string) {
  const { error } = await supabase.from('conversation_join_requests').delete().eq('id', requestId)
  if (error) throw error
}

// The bucket is private, so attachment_url stores the storage path, not a
// public URL — signChatAttachment() resolves it to a short-lived signed URL
// at render time.
export async function uploadChatAttachment(
  conversationId: string,
  file: File,
): Promise<{ url: string; kind: AttachmentKind; name: string }> {
  const kind: AttachmentKind = file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('audio/')
      ? 'audio'
      : 'file'
  const path = `${conversationId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('chat-attachments').upload(path, file)
  if (error) throw error
  return { url: path, kind, name: file.name }
}

export async function signChatAttachment(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('chat-attachments').createSignedUrl(path, 60 * 60)
  return data?.signedUrl ?? null
}

export async function sendMessage(params: {
  conversationId: string
  senderId: string
  text?: string | null
  attachment?: { url: string; kind: AttachmentKind; name: string } | null
  replyToMessageId?: string | null
}): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      text: params.text?.trim() || null,
      attachment_url: params.attachment?.url ?? null,
      attachment_kind: params.attachment?.kind ?? null,
      attachment_name: params.attachment?.name ?? null,
      reply_to_message_id: params.replyToMessageId ?? null,
    })
    .select('*')
    .single()
  if (error) throw error

  // Fire-and-forget: if the AI assistant is in this conversation, ask it to
  // reply. Never blocks the sender's own message from showing immediately.
  void maybeTriggerAiReply(params.conversationId)

  return data as Message
}

async function maybeTriggerAiReply(conversationId: string) {
  const { data: bot } = await supabase.from('profiles').select('id').eq('username', AI_BOT_USERNAME).maybeSingle()
  if (!bot) return
  const { data: isBotMember } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', bot.id)
    .maybeSingle()
  if (!isBotMember) return
  await supabase.functions.invoke('ai-bot-reply', { body: { conversationId } })
}

export const EDIT_WINDOW_MS = 15 * 60 * 1000
export const DELETE_WINDOW_MS = 60 * 60 * 1000

export function canEditMessage(m: Message, myUserId: string) {
  return m.sender_id === myUserId && !m.deleted && Date.now() - new Date(m.created_at).getTime() < EDIT_WINDOW_MS
}

export function canDeleteMessage(m: Message, myUserId: string) {
  return m.sender_id === myUserId && !m.deleted && Date.now() - new Date(m.created_at).getTime() < DELETE_WINDOW_MS
}

export async function editMessage(messageId: string, text: string) {
  const { error } = await supabase.from('messages').update({ text: text.trim() }).eq('id', messageId)
  if (error) throw error
}

export async function deleteMessage(messageId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ deleted: true, text: null, attachment_url: null, attachment_kind: null, attachment_name: null, reply_to_message_id: null })
    .eq('id', messageId)
  if (error) throw error
}

export function subscribeToConversationMessages(conversationId: string, onInsert: (m: Message) => void, onUpdate: (m: Message) => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as Message),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onUpdate(payload.new as Message),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

export function subscribeToMyConversations(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`conv-members:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onChange)
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
