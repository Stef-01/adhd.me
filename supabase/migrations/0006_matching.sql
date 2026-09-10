-- Phase M (ADR 0007): the bidirectional matching model. Mirrors src/lib/matching/types.ts.
--
-- Five tables, one per entity the brief names. The narrative and its embedding live on the
-- patient row; the GP row carries declared credentials and the bidirectional preferences as
-- JSON so a declaration can grow without a migration; matches carry both sides' scores and the
-- rationale; feedback is one row per side per match; checklists are one row per patient.
--
-- Nothing here is wired at runtime yet (the store is in memory behind globalThis, the same
-- posture as every other store). This file exists so the wiring unit (Phase M5) inherits a
-- shape that was reviewed with the code rather than invented at the end. The vector width is
-- the lexical embedder's (35 concepts + 224 hashed); a dense model changes it by migration.

create extension if not exists vector;

create table match_patients (
  id uuid primary key,
  name text not null,
  contact jsonb not null default '{}'::jsonb,
  location jsonb not null,
  narrative_text text not null,
  narrative_embedding vector(259),
  structured_signals jsonb not null,
  documents_uploaded jsonb not null default '[]'::jsonb,
  status text not null check (status in ('intake', 'matched', 'booked', 'consulted', 'closed')),
  condition text not null default 'adhd',
  created_at timestamptz not null default now()
);

create table match_gps (
  id text primary key,
  name text not null,
  short_name text not null,
  practice text not null,
  practice_location jsonb not null,
  telehealth_available boolean not null default false,
  accepting_new_patients boolean not null default true,
  credentials jsonb not null,
  preferences jsonb not null,
  bio_embedding vector(259),
  verification_status text not null check (verification_status in ('pending', 'verified', 'rejected')),
  verified_by text,
  verified_on date,
  -- A verified row names who verified it and when: the credentials lane's law, restated.
  check (verification_status <> 'verified' or (verified_by is not null and verified_on is not null)),
  rating_aggregate jsonb,
  conditions text[] not null default '{adhd}',
  languages text[] not null default '{}',
  appointment_length text not null default '',
  real_person boolean not null default false,
  image text
);

create table match_matches (
  id text primary key,
  patient_id uuid not null references match_patients(id) on delete cascade,
  gp_id text not null references match_gps(id) on delete cascade,
  patient_rank_score numeric(5, 3) not null,
  gp_rank_score numeric(5, 3) not null,
  similarity numeric(5, 3) not null,
  position smallint not null check (position between 1 and 3),
  match_status text not null check (match_status in ('proposed', 'accepted', 'declined', 'completed', 'withdrawn')),
  rationale jsonb not null,
  patient_breakdown jsonb not null,
  decline_reason text check (decline_reason in ('no_capacity', 'outside_scope', 'age_group', 'needs_specialist', 'other')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (patient_id, gp_id)
);

create table match_feedback (
  id text primary key,
  match_id text not null references match_matches(id) on delete cascade,
  side text not null check (side in ('patient', 'gp')),
  patient_rating jsonb,
  gp_rating jsonb,
  free_text_feedback text not null default '',
  created_at timestamptz not null default now(),
  check ((side = 'patient' and patient_rating is not null and gp_rating is null) or (side = 'gp' and gp_rating is not null and patient_rating is null)),
  unique (match_id, side)
);

create table match_checklists (
  id text primary key,
  patient_id uuid not null unique references match_patients(id) on delete cascade,
  items jsonb not null,
  generated_at timestamptz not null default now()
);

-- Default-deny, like 0001: policies land with the wiring unit, when there is an identity to
-- write them against.
alter table match_patients enable row level security;
alter table match_gps enable row level security;
alter table match_matches enable row level security;
alter table match_feedback enable row level security;
alter table match_checklists enable row level security;
