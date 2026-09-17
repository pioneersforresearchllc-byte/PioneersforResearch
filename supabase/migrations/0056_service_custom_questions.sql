-- Per-service custom request questions. The owner defines, for each service, a
-- list of questions (label + answer type: short/long/number/select/date/file).
-- When a service has questions, the request form renders them dynamically; the
-- visitor's answers are stored as a self-describing snapshot on the request so
-- the owner/teacher can read them without re-loading the service definition.
alter table services add column if not exists questions jsonb;
alter table service_requests add column if not exists custom_answers jsonb;
