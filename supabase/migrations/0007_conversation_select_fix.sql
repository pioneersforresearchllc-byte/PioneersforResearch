-- The creator of a conversation couldn't see it back immediately after
-- insert: conversations_select only allowed members, but at insert time
-- (before the conversation_members rows exist) the creator isn't a member
-- yet — a chicken-and-egg RLS failure that broke `INSERT ... RETURNING`
-- for both DM and group creation. The creator can now always see their
-- own conversation.

drop policy conversations_insert on conversations;
create policy conversations_insert on conversations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (type = 'dm' or (public.current_role() = 'teacher' or public.is_verified_owner()))
  );

drop policy conversations_select on conversations;
create policy conversations_select on conversations
  for select to authenticated
  using (
    public.is_conversation_member(id)
    or created_by = auth.uid()
    or public.is_verified_owner()
  );
