-- Supabase's security advisor (0014, extension in public): the vector extension lives in its own
-- schema, which the API does not expose. Columns keep their type; `extensions` is on the search path.
create schema if not exists extensions;
alter extension vector set schema extensions;
