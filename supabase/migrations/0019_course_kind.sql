-- Distinguish standalone "programs" from regular "courses". Both live in the
-- same table and reuse the same enrollment/assignment/certificate machinery
-- (a program is just a broader offering); only the label and which public
-- page/section they appear in differs. Existing rows stay courses.
alter table courses add column kind text not null default 'course'
  check (kind in ('course', 'program'));
