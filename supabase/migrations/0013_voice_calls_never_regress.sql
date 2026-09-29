-- A call reported turn by turn (stage 5) ends with one "revealed" report. The reports are upserts held open
-- concurrently by the route, so a late "stopped" report can commit after the end (production, 2026-09-30, 14:57:
-- a revealed call kept "stopped" and 4 questions). The table keeps the end: once revealed, a call never goes
-- back to stopped, and its turn count never shrinks.
create or replace function voice_calls_never_regress() returns trigger language plpgsql as $$
begin
  if old.outcome = 'revealed' and new.outcome = 'stopped' then
    return old;
  end if;
  if jsonb_array_length(coalesce(new.transcript, '[]'::jsonb)) < jsonb_array_length(coalesce(old.transcript, '[]'::jsonb)) then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists voice_calls_never_regress on voice_calls;
create trigger voice_calls_never_regress before update on voice_calls
  for each row execute function voice_calls_never_regress();
