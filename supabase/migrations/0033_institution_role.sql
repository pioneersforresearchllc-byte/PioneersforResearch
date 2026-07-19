-- Adds the 'institution' user role. MUST be run on its own (a new enum value
-- can't be used in the same transaction that adds it), before 0034 which
-- references it. Idempotent via IF NOT EXISTS.
alter type user_role add value if not exists 'institution';
