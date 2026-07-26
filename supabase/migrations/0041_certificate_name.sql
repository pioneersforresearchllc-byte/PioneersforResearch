-- The name to print on certificates, kept separate from the account name so a
-- casual/short/misspelled signup name never ends up on an official certificate.
-- Student-editable (falls back to profiles.name when empty).
alter table profiles add column if not exists certificate_name text;
