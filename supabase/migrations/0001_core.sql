-- Meherr core schema (W2). Mirrors src/domain/types.ts (consistency-tested).
-- RLS: default deny — every table enabled, no permissive policies until the auth
-- model lands (W11); service-role only until then.

create table practices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Australia/Sydney',
  holdout_rate numeric not null default 0.2 check (holdout_rate >= 0 and holdout_rate <= 0.5),
  created_at timestamptz not null default now()
);

create table clinicians (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  display_name text not null,
  participating boolean not null default false,
  created_at timestamptz not null default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  usual_clinician_id uuid references clinicians(id),
  sms_consent boolean not null default false,
  opted_out boolean not null default false,
  last_attended_at date,
  future_booking_at date,
  active_recall boolean not null default false,
  chronic_care boolean not null default false,
  holdout boolean not null default false,
  created_at timestamptz not null default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  clinician_id uuid not null references clinicians(id),
  starts_at timestamptz not null,
  status text not null check (status in ('open','booked','attended','dna','cancelled')),
  patient_id uuid references patients(id),
  generated_by_invitation boolean not null default false,
  appointment_type text check (appointment_type in ('standard','long','telehealth'))
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  patient_id uuid not null references patients(id),
  clinician_id uuid not null references clinicians(id),
  session_date date not null,
  status text not null check (status in ('queued','sent','booked','expired','opted_out')),
  sent_at timestamptz
);

create table outcome_records (
  appointment_id uuid primary key references appointments(id) on delete cascade,
  practice_id uuid not null references practices(id) on delete cascade,
  usefulness text[] not null default '{}',
  clinician_judged_reasonable boolean
);

create table audit_events (
  id bigint generated always as identity primary key,
  practice_id uuid not null references practices(id) on delete cascade,
  kind text not null check (kind in ('invitation_queued','invitation_sent','invitation_booked','invitation_expired','patient_opted_out','config_changed')),
  at timestamptz not null default now(),
  subject_id text not null,
  detail text not null default ''
);

-- RLS default-deny on every table
alter table practices enable row level security;
alter table clinicians enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table invitations enable row level security;
alter table outcome_records enable row level security;
alter table audit_events enable row level security;
