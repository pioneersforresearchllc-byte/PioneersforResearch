-- Per-service form questions: the owner can hide any of the optional request
-- questions for a given service. `hidden_fields` holds the keys the owner
-- turned off; the request form and its validation skip them.

alter table services add column if not exists hidden_fields text[] not null default '{}';
