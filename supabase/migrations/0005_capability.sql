-- W79: capability graph — what a GP is INTERESTED in, what they have EXPERIENCE of, and
-- what has been VERIFIED about them. Mirrors src/domain/types.ts (consistency-tested).
--
-- The venture brief (§5) makes one law about this: the three must never be conflated. It is
-- the difference between "Dr Lee enjoys skin work", "Dr Lee has seen 240 skin presentations
-- this year" and "Dr Lee holds a dermoscopy certificate someone checked". Collapsing them
-- into a single "skill" score is how a directory starts implying competence it cannot
-- support — an Ahpra advertising problem as much as a clinical one.
--
-- So they are THREE TABLES, not one table with a type column, and each carries a `source`
-- CHECK admitting exactly one value. The three vocabularies are disjoint, so there is no
-- write that moves a row from one category to another: promoting a self-reported interest
-- into experience would require inserting 'clinician_self_reported' into a column whose
-- CHECK only permits 'derived_case_mix', and the database refuses it.
--
-- Two further asymmetries, both deliberate:
--
--   * EXPERIENCE HAS NO PROSE. It is counts and a window and a computation timestamp. There
--     is no column a human can write a claim into, because experience is derived (W80) and
--     anything hand-written here would be a self-report wearing a derived label.
--   * COMPETENCE CANNOT BE SELF-ASSERTED. `attested_by` and `verified_on` are NOT NULL, so a
--     competence row cannot exist without naming who verified it and when. There is no path
--     to "verified" that does not record a verifier.
--
-- Nothing here is a clinical judgement about a patient, and none of it is patient-facing:
-- this describes clinicians, and W83 decides what a practice may see of it.

-- What a clinician says they want more of. Self-reported by definition, and labelled so.
create table clinician_interest (
  practice_id uuid not null references practices(id) on delete cascade,
  clinician_id uuid not null references clinicians(id) on delete cascade,
  condition_code text not null references conditions(code) on delete restrict,
  -- 1 (would take some) .. 5 (would take much more). A preference, never a capability.
  strength integer not null check (strength between 1 and 5),
  source text not null check (source = 'clinician_self_reported'),
  stated_at timestamptz not null default now(),
  primary key (practice_id, clinician_id, condition_code)
);

-- What a clinician has actually seen. Derived only (W80) — never typed in by anyone.
create table clinician_experience (
  practice_id uuid not null references practices(id) on delete cascade,
  clinician_id uuid not null references clinicians(id) on delete cascade,
  condition_code text not null references conditions(code) on delete restrict,
  attended_visits integer not null check (attended_visits >= 0),
  -- The window the count was measured over, so a number can never float free of its period.
  window_from date not null,
  window_to date not null,
  source text not null check (source = 'derived_case_mix'),
  computed_at timestamptz not null default now(),
  primary key (practice_id, clinician_id, condition_code),
  check (window_to >= window_from)
);

-- What someone external has verified. Cannot exist without naming the verifier.
create table clinician_competence (
  practice_id uuid not null references practices(id) on delete cascade,
  clinician_id uuid not null references clinicians(id) on delete cascade,
  condition_code text not null references conditions(code) on delete restrict,
  credential text not null check (length(trim(credential)) > 0),
  -- Who checked it. NOT NULL is the whole control: no anonymous verification.
  attested_by text not null check (length(trim(attested_by)) > 0),
  verified_on date not null,
  -- Null means no stated expiry, not "never expires" — W82 decides how to treat that.
  expires_on date,
  source text not null check (source = 'external_verification'),
  primary key (practice_id, clinician_id, condition_code, credential),
  check (expires_on is null or expires_on >= verified_on)
);

alter table clinician_interest enable row level security;
alter table clinician_experience enable row level security;
alter table clinician_competence enable row level security;

create policy clinician_interest_by_membership on clinician_interest
  for all using (practice_id in (select practice_id from memberships where email = auth.jwt()->>'email'));

create policy clinician_experience_by_membership on clinician_experience
  for all using (practice_id in (select practice_id from memberships where email = auth.jwt()->>'email'));

create policy clinician_competence_by_membership on clinician_competence
  for all using (practice_id in (select practice_id from memberships where email = auth.jwt()->>'email'));

-- Routing (W84) asks "who in this practice has experience of this condition".
create index clinician_experience_by_condition
  on clinician_experience (practice_id, condition_code, attended_visits desc);
