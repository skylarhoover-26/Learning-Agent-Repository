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
  avatar                 jsonb,                      -- avatar is an object, not text
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
-- avatar is an object; if it was created as text, convert it to jsonb (parses
-- any existing stringified values). Safe to re-run.
alter table profiles alter column avatar type jsonb using (
  case when avatar is null or avatar::text = '' then null else avatar::text::jsonb end
);

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

-- ─────────────────────────────────────────────────────────────
-- SLACK: two-way conversation log (admin monitoring) + event dedup
-- ─────────────────────────────────────────────────────────────
-- Every inbound (user → bot) and outbound (bot → user) Slack message is logged
-- here so admins can monitor coaching conversations at /admin/conversations.
-- email may be null when a Slack user can't be mapped to an app identity.
create table if not exists slack_conversations (
  id             bigint generated always as identity primary key,
  email          text,                          -- app identity (lowercased), null if unmapped
  slack_user_id  text,                           -- Slack "U..." id
  direction      text not null,                  -- 'inbound' | 'outbound'
  channel        text,                           -- Slack channel / IM id
  text           text not null default '',
  meta           jsonb default '{}'::jsonb,      -- event_id, lessonTopic, command, source...
  created_at     timestamptz not null default now()
);
create index if not exists slack_conversations_email_created_idx  on slack_conversations(email, created_at desc);
create index if not exists slack_conversations_created_idx        on slack_conversations(created_at desc);

-- Idempotency guard: Slack retries an event (up to 3x) if we don't 200 within
-- 3s. We ack immediately and process the reply async, but a slow ack can still
-- trigger a retry — insert the event_id here first and skip if it already ran,
-- so a user is never double-replied. Old rows can be pruned; primary key is the
-- Slack event_id.
create table if not exists slack_processed_events (
  event_id    text primary key,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- FEEDBACK: in-app feedback submissions (admin triage at /admin/feedback)
-- ─────────────────────────────────────────────────────────────
-- One row per feedback submission. Keyed by the app-generated record id
-- ("<ts>-<uuid>" for in-app submissions, "imported-*" for tester-script imports).
-- Mirrors the profiles pattern: queryable columns for the admin views + a `raw`
-- jsonb that is the lossless source of truth on read-back. Screenshots are NOT
-- stored here — they live in Vercel Blob and only their URLs are kept below.
-- notes[] is the admin note thread; screenshot_urls[] is the attached-image set.
create table if not exists feedback (
  id              text primary key,               -- record.id
  email           text,                           -- submitter (from Okta session)
  name            text,
  category        text,                           -- Idea | Bug | Confusing | Praise | Other
  text            text,
  page            text,                           -- app page the feedback was filed from
  status          text,                           -- open | done | skipped
  priority        text,                           -- feedback-priority level, or null (unsorted)
  feature         text,                           -- feature-area tag, or null
  done_by         text,                           -- admin who resolved it
  done_at         timestamptz,
  screenshot_urls jsonb default '[]'::jsonb,       -- blob URLs only
  notes           jsonb default '[]'::jsonb,       -- [{ text, by, at }] admin note thread
  raw             jsonb not null,                 -- full record, verbatim (source of truth on read)
  created_at      timestamptz,                    -- from record.at (submit time)
  updated_at      timestamptz default now()
);
create index if not exists feedback_created_idx  on feedback(created_at desc);
create index if not exists feedback_status_idx   on feedback(status);

-- Atomic note append. Adds one note to BOTH the flat `notes` column and the
-- `raw` record (raw is the read source) in a single UPDATE, so concurrent note
-- adds — a double-click, a held Enter, or two admins at once — can never
-- clobber each other the way a read-modify-write of the whole record could.
-- Returns the updated `raw` record, or NULL when no row matches the id.
-- Safe to re-run (create or replace).
create or replace function append_feedback_note(p_id text, p_note jsonb)
returns jsonb
language sql
as $$
  update feedback
  set notes      = coalesce(notes, '[]'::jsonb) || jsonb_build_array(p_note),
      raw        = jsonb_set(
                     raw,
                     '{notes}',
                     coalesce(raw->'notes', '[]'::jsonb) || jsonb_build_array(p_note),
                     true
                   ),
      updated_at = now()
  where id = p_id
  returning raw;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY
-- The app talks to Supabase ONLY from server-side routes using the service_role
-- key, which bypasses RLS. We still enable RLS (default-deny) so that if the
-- anon/public key is ever exposed, no rows are readable. One service_role policy
-- per table keeps server access working.
-- ═══════════════════════════════════════════════════════════════════════════
alter table profiles                enable row level security;
alter table xp_events               enable row level security;
alter table user_documents          enable row level security;
alter table system_documents        enable row level security;
alter table slack_conversations     enable row level security;
alter table slack_processed_events  enable row level security;
alter table feedback                enable row level security;

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
  if not exists (select 1 from pg_policies where tablename = 'slack_conversations' and policyname = 'service_role_all') then
    create policy service_role_all on slack_conversations for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'slack_processed_events' and policyname = 'service_role_all') then
    create policy service_role_all on slack_processed_events for all to service_role using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'feedback' and policyname = 'service_role_all') then
    create policy service_role_all on feedback for all to service_role using (true) with check (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Rate limiting (security review F-09)
-- ---------------------------------------------------------------------------
-- F-09 asked for auth AND rate limiting on the routes that trigger paid model
-- calls and outbound feed fetches. Auth landed first; this is the throttle.
--
-- Counters live here rather than in a new Redis because Supabase is already
-- provisioned, the check is a single round trip, and it works across every
-- serverless instance and region (an in-process counter does not — each cold
-- start gets its own, so a caller simply spreads across instances).
--
-- Fixed window, not sliding: a caller can in theory get 2x the limit across a
-- window boundary. That is fine for a cost guardrail and keeps the whole thing
-- one atomic statement. A sliding window needs per-hit rows and a periodic
-- sweep, which is a lot of machinery for a control whose job is to stop a loop.
create table if not exists rate_limits (
  key           text primary key,
  window_start  timestamptz not null default now(),
  count         integer     not null default 0
);

alter table rate_limits enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'rate_limits' and policyname = 'service_role_all') then
    create policy service_role_all on rate_limits for all to service_role using (true) with check (true);
  end if;
end $$;

-- Record one hit and say whether it is allowed.
--
-- The whole decision is a single INSERT .. ON CONFLICT so two concurrent
-- requests cannot both read "count = limit - 1" and both proceed. The CASE in
-- the UPDATE is what expires a window: if the stored window is older than
-- p_window_seconds the row resets to 1 rather than incrementing.
--
-- Returns the post-hit count, so a caller over the limit still increments —
-- deliberate. A caller hammering the endpoint keeps its window alive rather
-- than being handed a fresh allowance the moment the old one lapses.
create or replace function rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, current_count integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_start timestamptz;
begin
  insert into rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
          else r.count + 1
        end,
        window_start = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else r.window_start
        end
  returning r.count, r.window_start into v_count, v_start;

  return query select
    (v_count <= p_limit),
    v_count,
    (v_start + make_interval(secs => p_window_seconds));
end;
$$;

-- Housekeeping: rows are tiny and self-expiring in meaning but not on disk.
-- Call occasionally (or from a cron) to drop windows nothing has touched.
create or replace function rate_limits_prune(p_older_than_hours integer default 24)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from rate_limits
   where window_start < now() - make_interval(hours => p_older_than_hours);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- ---------------------------------------------------------------------------
-- Activity events (reporting)
--
-- Everything the admin Activity Log shows, in a table you can actually query.
-- The log itself lives in blob storage as one immutable object per event
-- (audit/<date>/<id>.json), which is fine for "show me today" and useless for
-- "how is Andrea's team doing on lessons this month" — that question needs a
-- join and a group-by, not 2,000 HTTP fetches.
--
-- Blob stays the source of truth; this mirrors alongside it. A Supabase failure
-- must never break the write path (lib/audit-log.js swallows it), so treat this
-- table as complete-from-the-day-it-shipped, not complete historically.
--
-- NOT foreign-keyed to profiles on purpose. Events fire from crons, Slack, and
-- signed-out paths where there is no profile row, and an FK violation would
-- throw away the event — which is the one thing a log must not do.
create table if not exists activity_events (
  id          text primary key,                 -- same id as the blob entry
  created_at  timestamptz not null default now(),
  type        text not null,                    -- lesson_complete | game_complete | page_visit | ...
  endpoint    text,
  email       text,
  name        text,
  department  text,
  tier        text,                             -- level at the time of the event
  duration_ms integer default 0,
  error       text,
  input       jsonb default '{}'::jsonb,        -- the event payload (topic, score, format...)
  output      jsonb
);
-- "What has this person been doing lately" and "everything of this kind today"
-- are the two queries this table exists to answer.
create index if not exists activity_events_email_created_idx on activity_events(email, created_at desc);
create index if not exists activity_events_type_created_idx  on activity_events(type, created_at desc);
create index if not exists activity_events_created_idx       on activity_events(created_at desc);

alter table activity_events enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'activity_events' and policyname = 'service_role_all') then
    create policy service_role_all on activity_events for all to service_role using (true) with check (true);
  end if;
end $$;
