-- English translations of owner/teacher-authored content, auto-filled by
-- the translate-text Edge Function (Gemini) right after create/update.
-- Null until translation completes; the frontend falls back to the Arabic
-- text if the English column is empty.
alter table courses add column title_en text;
alter table courses add column description_en text;

alter table articles add column title_en text;
alter table articles add column content_en text;
