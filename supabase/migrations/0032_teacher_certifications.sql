-- Free-text certificates / credentials a teacher can list on their profile
-- (e.g. "Harvard-certified clinical researcher"). Title (specialty),
-- qualification and years_experience already exist on profiles.
alter table profiles add column if not exists certifications text;
