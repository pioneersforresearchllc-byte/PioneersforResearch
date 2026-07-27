-- Add an optional 1–5 star rating to each homepage comment. Separate from 0047
-- (add column if not exists) so it applies cleanly whether or not 0047 was
-- already run.

alter table site_comments add column if not exists rating int
  check (rating is null or rating between 1 and 5);
