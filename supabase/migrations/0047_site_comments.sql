-- Public comments wall on the homepage: any signed-in user can leave a short
-- comment that is shown publicly to everyone (visitors included). Post-
-- moderation: a comment appears immediately, and either its author or a
-- verified owner (admin) can delete it. Mirrors the article_comments model.

create table if not exists site_comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists site_comments_created_idx on site_comments(created_at desc);

alter table site_comments enable row level security;

-- Anyone (including logged-out visitors) can read the wall.
drop policy if exists site_comments_select_public on site_comments;
create policy site_comments_select_public on site_comments
  for select to anon, authenticated using (true);

-- Only signed-in users may post, and only as themselves.
drop policy if exists site_comments_insert on site_comments;
create policy site_comments_insert on site_comments
  for insert to authenticated with check (author_id = auth.uid());

-- The author can remove their own comment; the owner can remove ANY comment.
drop policy if exists site_comments_delete on site_comments;
create policy site_comments_delete on site_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_verified_owner());

grant select on site_comments to anon, authenticated;
grant insert, delete on site_comments to authenticated;
