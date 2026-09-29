-- The founder, 2026-09-29: every call and every read recorded and kept, for this simulation phase
-- (qa/matching/rca.md, R15: a call that went wrong could not be replayed). A voice call keeps every
-- turn, the request it wrote and the place; a search keeps the asks the model reader heard that no
-- key covers, so a need the vocabulary lacks is seen rather than lost. Mirrors src/db/finder.ts.
alter table voice_calls
  add column transcript jsonb not null default '[]'::jsonb,
  add column request text not null default '',
  add column place text not null default '';
alter table finder_searches
  add column unlisted text[] not null default '{}';
