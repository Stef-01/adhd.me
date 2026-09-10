-- Phase M5: which console practice manages which GP profile. Null until a practice claims the
-- profile from /console/gp; a claimed profile is managed by that practice's members only, and
-- ADHD.ME staff. Mirrors `practiceId` on `src/lib/matching/types.ts`.

alter table match_gps add column practice_id text;
create index match_gps_practice_id on match_gps (practice_id);
