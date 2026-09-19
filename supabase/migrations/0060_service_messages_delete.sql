-- Let a sender delete their own service-chat message (edit already works via the
-- existing service_messages_update policy).
drop policy if exists service_messages_delete on service_messages;
create policy service_messages_delete on service_messages
  for delete to authenticated using (sender_id = auth.uid());
grant delete on service_messages to authenticated;
