-- The finder's own record (docs/data/FINDER-DATA.md): what a search on the Support tab creates, from
-- the words to the handoff, and the stars a person gives after the visit. Mirrors src/db/finder.ts.
-- Like 0006 the server writes it with the service role through a journal, and everyone else is
-- denied. Nothing a person writes here is ever shown to anyone: ratings teach the ranking which asks,
-- when met, made a good visit (src/db/learn.ts), and never make or show a clinician's standing (C2).

-- One search: the words, how they came in, what the finder read in them and what it showed.
create table finder_searches (
  id uuid primary key,
  device_id text not null,
  created_at timestamptz not null default now(),
  source text not null check (source in ('typed', 'dictation', 'voice')),
  request_text text not null check (char_length(request_text) <= 2000),
  place text not null default '',
  filters jsonb not null default '{}'::jsonb,
  read_source text not null check (read_source in ('lexicon', 'llm')),
  asked text[] not null default '{}',
  shown text[] not null default '{}'
);
create index finder_searches_device on finder_searches (device_id, created_at desc);

-- One voice call (src/voice): how it went, never what was said beyond the request it wrote.
create table voice_calls (
  id uuid primary key,
  device_id text not null,
  search_id uuid references finder_searches(id) on delete set null,
  created_at timestamptz not null default now(),
  model text not null,
  questions smallint not null check (questions between 0 and 8),
  seconds integer not null check (seconds >= 0),
  outcome text not null check (outcome in ('revealed', 'stopped', 'failed', 'urgent'))
);

-- What a person did with a search's list.
create table finder_events (
  id uuid primary key,
  search_id uuid not null references finder_searches(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('profile', 'compare', 'more', 'heard', 'filter')),
  clinician_id text
);
create index finder_events_search on finder_events (search_id);

-- The tap on "Book" that leaves for the practice (/go/<id>): the last moment this product sees.
-- It carries the asks the search made and which of them this clinician declared, so a rating of
-- the visit can teach which asks mattered.
create table finder_handoffs (
  id uuid primary key,
  search_id uuid references finder_searches(id) on delete set null,
  device_id text not null,
  clinician_id text not null,
  created_at timestamptz not null default now(),
  asked text[] not null default '{}',
  met text[] not null default '{}'
);

-- The stars and words after a visit, from the finder (a handoff) or /match (a match). One per visit;
-- a second answer replaces the first. Internal only.
create table visit_ratings (
  id uuid primary key,
  source text not null check (source in ('finder', 'match')),
  handoff_id uuid unique references finder_handoffs(id) on delete cascade,
  match_id text unique references match_matches(id) on delete cascade,
  clinician_id text not null,
  device_id text not null default '',
  stars smallint not null check (stars between 1 and 5),
  feedback text not null default '' check (char_length(feedback) <= 1000),
  asked text[] not null default '{}',
  met text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source = 'finder' and handoff_id is not null and match_id is null)
    or (source = 'match' and match_id is not null and handoff_id is null)
  )
);

-- What the learner reads: for each ask, how visits went when the clinician declared it and when
-- they did not. Per ask, never per clinician.
create view facet_rating_signal as
  select
    key,
    count(*) filter (where key = any (met)) as met_n,
    avg(stars) filter (where key = any (met)) as met_stars,
    count(*) filter (where not (key = any (met))) as unmet_n,
    avg(stars) filter (where not (key = any (met))) as unmet_stars
  from visit_ratings, unnest(asked) as key
  group by key;

alter table finder_searches enable row level security;
alter table voice_calls enable row level security;
alter table finder_events enable row level security;
alter table finder_handoffs enable row level security;
alter table visit_ratings enable row level security;
