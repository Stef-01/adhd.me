-- Demonstrated quality (founder, 2026-09-28: "a full ranking factor"): how each clinician's visits
-- went, which src/db/quality.ts turns into a bounded multiplier on their fit. Per clinician, unlike
-- facet_rating_signal; read by the server's service role only and never shown to anyone.
create view clinician_rating_signal with (security_invoker = true) as
  select clinician_id, count(*) as visits, sum(stars) as stars
  from visit_ratings
  group by clinician_id;

-- Both views read as the caller, so visit_ratings' row-level security (no policy: the service role
-- only) holds through them as well.
alter view facet_rating_signal set (security_invoker = true);
revoke all on clinician_rating_signal, facet_rating_signal from anon, authenticated;
