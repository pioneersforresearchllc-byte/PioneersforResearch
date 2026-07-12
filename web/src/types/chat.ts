import type { UserRole } from '@/types/profile'

export type ConversationType = 'dm' | 'group'
export type AttachmentKind = 'image' | 'audio' | 'file'

export interface ChatProfile {
  id: string
  name: string
  username: string
  avatar_url: string | null
  role: UserRole
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  text: string | null
  attachment_url: string | null
  attachment_kind: AttachmentKind | null
  attachment_name: string | null
  reply_to_message_id: string | null
  deleted: boolean
  edited: boolean
  created_at: string
  sender?: ChatProfile
  replyTo?: Message | null
}

export interface ConversationMember {
  conversation_id: string
  user_id: string
  is_admin: boolean
  joined_at: string
  profile: ChatProfile
}

export interface JoinRequest {
  id: string
  conversation_id: string
  user_id: string
  requested_by: string
  created_at: string
  profile: ChatProfile
}

export interface ConversationSummary {
  id: string
  type: ConversationType
  name: string | null
  created_by: string
  created_at: string
  members: ConversationMember[]
  /** For DM conversations, the other participant (null for group). */
  otherMember: ChatProfile | null
  lastMessage: Message | null
  unreadCount: number
  isAdmin: boolean
}
