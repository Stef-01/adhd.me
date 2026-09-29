-- A call the interviewer stretched past its cap of eight questions is still a call that happened:
-- the table refused it whole (2026-09-29, three of the founder's own calls left no transcript while
-- their searches landed, and the 204 from the route said nothing). The parser bounds the count at
-- 32 (src/db/finder.ts); the table allows 64.
alter table voice_calls drop constraint if exists voice_calls_questions_check;
alter table voice_calls add constraint voice_calls_questions_check check (questions between 0 and 64);
