-- W18: multi-tenancy — memberships table + row-level isolation policies.
-- RLS was enabled default-deny in 0001; these policies open exactly one path:
-- rows of the practice(s) the authenticated staff email belongs to. The JWT email
-- claim is the identity carried by the auth provider (mock now, Supabase auth later).

create table memberships (
  practice_id uuid not null references practices(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','manager','clinician')),
  primary key (practice_id, email)
);

alter table memberships enable row level security;

-- A staff member sees only their own membership rows.
create policy memberships_self on memberships
  for select using (email = auth.jwt()->>'email');

-- Shared predicate, inlined per policy: the practices this JWT belongs to.
-- (A patient/booking identity carries no email claim and therefore matches nothing.)

create policy practices_by_membership on practices
  for all using (id in (select practice_id from memberships where email = auth.jwt()->>'email'));

create policy clinicians_by_membership on clinicians
  for all using (practice_id in (select practice_id from memberships where email = auth.jwt()->>'email'));

create policy patients_by_membership on patients
  for all using (practice_id in (select practice_id from memberships where email = auth.jwt()->>'email'));

create policy appointments_by_membership on appointments
  for all using (practice_id in (select practice_id from memberships where email = auth.jwt()->>'email'));

create policy invitations_by_membership on invitations
  for all using (practice_id in (select practice_id from memberships where email = auth.jwt()->>'email'));

create policy outcome_records_by_membership on outcome_records
  for all using (practice_id in (select practice_id from memberships where email = auth.jwt()->>'email'));

create policy audit_events_by_membership on audit_events
  for all using (practice_id in (select practice_id from memberships where email = auth.jwt()->>'email'));
