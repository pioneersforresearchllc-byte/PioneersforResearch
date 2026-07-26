-- Let the admin position the verification QR and the issue date on each
-- certificate template (percentages, like name_x/course_x). Sensible defaults
-- place the QR at the bottom-start corner and the date at the bottom-end.
alter table certificate_templates add column if not exists qr_x numeric not null default 10;
alter table certificate_templates add column if not exists qr_y numeric not null default 86;
alter table certificate_templates add column if not exists date_x numeric not null default 84;
alter table certificate_templates add column if not exists date_y numeric not null default 90;
