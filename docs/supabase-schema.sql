-- ═══════════════════════════════════════════════════════════════════════════
-- AI Learning Coach — Supabase schema (Stage 1)
-- Project ref: knfubklmbkwgghitesqf
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste all → Run.
-- Safe to re-run: every statement is idempotent (if not exists / on conflict).
-- No app data is touched by this file — it only creates empty tables + policies.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- TIER 1: RELATIONAL (cross-user queries live here)
-- ─────────────────────────────────────────────────────────────

-- One row per user. Keyed by Okta session email (the verified identity).
create table if not exists profiles (
  email                  text primary key,          -- @housecallpro.com, from Okta
  learner_id             text,                       -- legacy resolveLearnerId value (usually == email)
  display_name           text,
  name                   text,
  department             text,
  sub_team               text,
  tier                   text,
  avatar                 text,
  title                  text,                       -- Snowflake job title
  manager                text,                       -- Snowflake reporting manager (name)
  hire_date              text,                       -- Snowflake hire date (ISO string)
  onboarded              boolean default false,
  goals                  jsonb default '[]'::jsonb,  -- string[] (newer multi-goal format)
  preferred_tools        jsonb default '[]'::jsonb,
  role_history           jsonb default '[]'::jsonb,
  scheduled_role_change  jsonb,
  role_changed_at        timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Append-only XP ledger. This is what the leaderboard / compare aggregate.
-- id is the client-generated "xp_<ts>_<rand>" — makes inserts idempotent and
-- preserves the app's existing one-time-award guards (first_login, first_quest).
create table if not exists xp_events (
  id          text primary key,
  email       text not null references profiles(email) on delete cascade,
  source      text not null,                  -- lesson_complete | game_complete | first_login | ...
  amount      integer not null default 0,
  created_at  timestamptz not null default now(),
  meta        jsonb default '{}'::jsonb
);
create index if not exists xp_events_email_created_idx on xp_events(email, created_at);
create index if not exists xp_events_source_idx        on xp_events(email, source);

-- Backfill columns onto an already-created profiles table (safe to re-run).
alter table profiles add column if not exists title     text;
alter table profiles add column if not exists manager   text;
alter table profiles add column if not exists hire_date text;
-- Full profile object stored verbatim, so per-user reads are lossless (Stage 3).
alter table profiles add column if not exists raw       jsonb;

-- Cross-user XP totals for the leaderboard: sum xp_events per email server-side
-- (one round-trip, scales past the 1000-row select cap). Floored at 0 so a net-
-- negative balance from admin corrections never shows below zero.
create or replace function leaderboard_totals()
returns table(email text, total_xp bigint)
language sql
stable
as $$
  select email, greatest(0, sum(amount))::bigint as total_xp
  from xp_events
  group by email
$$;
grant execute on function leaderboard_totals() to service_role;

-- ─────────────────────────────────────────────────────────────
-- TIER 2: DOCUMENT (per-user, read/written whole — the long tail)
-- badges, lessons, paused lessons, notifications, goals, game state, chat,
-- calibration, impact scores, library usage, module progress, curriculum...
-- ─────────────────────────────────────────────────────────────
create table if not exists user_documents (
  email       text not null,
  doc_type    text not null,                  -- 'lp_badges' | 'lp_lessons' | 'learner_goals' | ...
  data        jsonb not null default 'null'::jsonb,
  updated_at  timestamptz default now(),
  primary key (email, doc_type)
);

-- ─────────────────────────────────────────────────────────────
-- TIER 3: SYSTEM / GLOBAL (not per-user)
-- admin_allowlist, notify_allowlist, xp_reset epoch, etc.
-- ─────────────────────────────────────────────────────────────
create table if not exists system_documents (
  key         text primary key,
  data        jsonb not null,
  updated_at  timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY
-- The app talks to Supabase ONLY from server-side routes using the service_role
-- key, which bypasses RLS. We still enable RLS (default-deny) so that if the
-- anon/public key is ever exposed, no rows are readable. One service_role policy
-- per table keeps server access working.
-- ═══════════════════════════════════════════════════════════════════════════
alter table profiles         enable row level security;
alter table xp_events        enable row level security;
alter table user_documents   enable row level security;
alter table system_documents enable row level security;

-- service_role has full access (used by the server). Guard creation so re-runs
-- don't error on an existing policy.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'service_role_all') then
    create policy service_role_all on profiles for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'xp_events' and policyname = 'service_role_all') then
    create policy service_role_all on xp_events for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_documents' and policyname = 'service_role_all') then
    create policy service_role_all on user_documents for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'system_documents' and policyname = 'service_role_all') then
    create policy service_role_all on system_documents for all to service_role using (true) with check (true);
  end if;
end $$;
