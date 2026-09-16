-- Richer owner overview: the existing totals PLUS this-week vs last-week counts
-- for the key metrics, so the dashboard can show week-over-week deltas.
-- New function (v2) so the old one keeps working during rollout.

create or replace function public.get_owner_overview_stats_v2()
returns table (
  pending_teacher_count bigint,
  approved_teacher_count bigint,
  courses_count bigint,
  students_count bigint,
  total_revenue_cents bigint,
  login_count bigint,
  overall_avg_rating numeric,
  enrollments_count bigint,
  requests_count bigint,
  students_this_week bigint,
  students_last_week bigint,
  enrollments_this_week bigint,
  enrollments_last_week bigint,
  requests_this_week bigint,
  requests_last_week bigint,
  revenue_this_week_cents bigint,
  revenue_last_week_cents bigint,
  logins_this_week bigint,
  logins_last_week bigint
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
    (select coalesce(avg(avg_rating), 0)::numeric(3, 2) from course_stats where rating_count > 0),
    (select count(*) from enrollments),
    (select count(*) from service_requests),
    -- students (profiles.created_at)
    (select count(*) from profiles where role = 'student' and created_at >= now() - interval '7 days'),
    (select count(*) from profiles where role = 'student' and created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'),
    -- enrollments (enrolled_at)
    (select count(*) from enrollments where enrolled_at >= now() - interval '7 days'),
    (select count(*) from enrollments where enrolled_at >= now() - interval '14 days' and enrolled_at < now() - interval '7 days'),
    -- service requests
    (select count(*) from service_requests where created_at >= now() - interval '7 days'),
    (select count(*) from service_requests where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'),
    -- revenue (completed payments)
    (select coalesce(sum(amount_cents), 0) from payments where status = 'completed' and created_at >= now() - interval '7 days'),
    (select coalesce(sum(amount_cents), 0) from payments where status = 'completed' and created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'),
    -- logins
    (select count(*) from login_events where created_at >= now() - interval '7 days'),
    (select count(*) from login_events where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days');
end;
$$;

grant execute on function public.get_owner_overview_stats_v2() to authenticated;
