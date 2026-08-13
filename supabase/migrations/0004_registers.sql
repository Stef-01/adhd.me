-- W55: care-gap register schema — conditions, guideline intervals, register membership.
-- Mirrors src/domain/types.ts (consistency-tested).
--
-- Two kinds of table arrive here for the first time:
--
--   * REFERENCE data (conditions, guideline_intervals) is national clinical guidance,
--     identical for every practice, so it is NOT practice-scoped. RLS is readable by
--     any staff identity and writable by none — reference rows change by migration,
--     not by a tenant. This is the first exception to the "everything is scoped by
--     membership" rule from 0003, and the schema-consistency test pins it so the
--     exception cannot silently spread to practice data.
--
--   * register_membership is per-practice patient data and is scoped exactly like
--     every other practice table.
--
-- G5 note: this migration ships the CONTAINER for guideline intervals and no interval
-- values. The intervals themselves are clinical content (W56) and carry a founder
-- clinical sign-off gate; nothing here asserts a clinical fact.

-- Conditions a register can be built for. Codes are stable identifiers used by code
-- and data alike, so they are the primary key rather than a surrogate uuid.
create table conditions (
  code text primary key,
  display_name text not null,
  -- Plain-English description for practice-facing UI. Never a clinical definition:
  -- membership comes from the PMS condition flag, not from anything written here.
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- A guideline-recommended interval between reviews for a condition.
--
-- Provenance is structural, not documentary: every source column is NOT NULL, so an
-- interval cannot be stored without saying where it came from and when that source
-- was published and read. W56 populates this table; its gate is that every row here
-- traces to a citation.
create table guideline_intervals (
  id uuid primary key default gen_random_uuid(),
  condition_code text not null references conditions(code) on delete restrict,
  -- What is being scheduled (e.g. a named review or measurement in the guideline).
  name text not null,
  interval_months integer not null check (interval_months > 0 and interval_months <= 60),
  source_citation text not null check (length(trim(source_citation)) > 0),
  source_url text not null check (source_url like 'https://%'),
  source_published_on date not null,
  source_retrieved_on date not null,
  created_at timestamptz not null default now(),
  -- One named interval per condition; changing a guideline replaces the row.
  unique (condition_code, name),
  -- A source cannot be retrieved before it was published.
  check (source_retrieved_on >= source_published_on)
);

-- Which patients are on which register, and on what evidence.
--
-- `source` is deliberately constrained to non-inferential origins. There is no value
-- here for "inferred from symptoms" or "predicted", so symptom-based membership is
-- not representable in storage at all — the G7/TGA boundary is enforced by the schema
-- before W57's engine ever runs.
create table register_membership (
  practice_id uuid not null references practices(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  condition_code text not null references conditions(code) on delete restrict,
  source text not null check (source in ('pms_condition_flag', 'practice_confirmed')),
  added_at timestamptz not null default now(),
  -- Set when the patient leaves the register; history is kept rather than deleted.
  removed_at timestamptz,
  primary key (practice_id, patient_id, condition_code),
  check (removed_at is null or removed_at >= added_at)
);

alter table conditions enable row level security;
alter table guideline_intervals enable row level security;
alter table register_membership enable row level security;

-- Reference data: any staff identity may read it; nobody may write it through the
-- API. A patient/booking identity carries no email claim and so matches nothing,
-- exactly as in 0003.
create policy conditions_read on conditions
  for select using (auth.jwt()->>'email' is not null);

create policy guideline_intervals_read on guideline_intervals
  for select using (auth.jwt()->>'email' is not null);

-- Practice data: same membership scoping as every other practice table.
create policy register_membership_by_membership on register_membership
  for all using (practice_id in (select practice_id from memberships where email = auth.jwt()->>'email'));

-- Register lookups are always "this practice's members for this condition".
create index register_membership_by_condition
  on register_membership (practice_id, condition_code)
  where removed_at is null;
