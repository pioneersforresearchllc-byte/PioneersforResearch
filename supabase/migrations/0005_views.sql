-- Read-optimized aggregates for the marketing site and owner dashboard.

-- course_stats: fine as a plain security_invoker view — every table it
-- touches (courses, course_ratings, enrollments) is already correctly
-- scoped by its own RLS, so there's nothing extra to enforce here.
create view course_stats
with (security_invoker = true) as
select
  c.id as course_id,
  coalesce(avg(r.stars), 0)::numeric(3, 2) as avg_rating,
  count(r.stars) as rating_count,
  count(distinct e.id) filter (where e.status in ('active', 'completed')) as enrolled_count
from courses c
left join course_ratings r on r.course_id = c.id
left join enrollments e on e.course_id = c.id
group by c.id;

-- owner_overview_stats deliberately is NOT a security_invoker view: it's a
-- single aggregated row, so per-row RLS filtering can't gate access to it
-- the way it does for course_stats — a plain view here would let any
-- authenticated caller compute e.g. their own slice of "total revenue"
-- instead of getting cleanly refused. A SECURITY DEFINER function with an
-- explicit is_verified_owner() check is the correct boundary.
create or replace function public.get_owner_overview_stats()
returns table (
  pending_teacher_count bigint,
  approved_teacher_count bigint,
  courses_count bigint,
  students_count bigint,
  total_revenue_cents bigint,
  login_count bigint,
  overall_avg_rating numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_verified_owner() then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select count(*) from profiles where role = 'teacher' and status = 'pending'),
    (select count(*) from profiles where role = 'teacher' and status = 'active'),
    (select count(*) from courses),
    (select count(*) from profiles where role = 'student'),
    (select coalesce(sum(amount_cents), 0) from payments where status = 'completed'),
    (select count(*) from login_events),
    (select coalesce(avg(avg_rating), 0)::numeric(3, 2) from course_stats where rating_count > 0);
end;
$$;

grant execute on function public.get_owner_overview_stats() to authenticated;
