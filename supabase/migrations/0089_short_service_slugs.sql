-- 0089: Short, readable service URLs. Old links keep working: the site maps
-- every old slug to its new one and redirects (web/src/lib/serviceSlugs.ts).
-- Idempotent: each rename only runs while the old slug still exists and the
-- new one is free, so re-running is a no-op.

update services set slug = 'research-proposal'
where slug = 'presentation'
  and not exists (select 1 from services where slug = 'research-proposal');

update services set slug = 'proposal-and-analysis'
where slug = 'idea-to-research-proposal-conversion-pac-548ho'
  and not exists (select 1 from services where slug = 'proposal-and-analysis');

update services set slug = 'clinicaltrials-registration'
where slug = 'complete-preparation-and-submission-of-c-z45nq'
  and not exists (select 1 from services where slug = 'clinicaltrials-registration');

-- Check: the current service URLs
select slug, title from services order by slug;
