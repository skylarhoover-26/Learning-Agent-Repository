# Supabase Migration Plan — AI Learning Coach (learning-agent)

**Status:** PLAN ONLY — no code written, no data moved. For Skylar's review.
**Date:** 2026-07-01
**Author:** Claude Code session
**Prereq unblocked:** Okta SSO went live in production today → we now have a **stable, verified user key (session email)** to build on.

---

## 1. Why we're doing this

Today all user data is **localStorage-first with a Vercel Blob backup**. That works for a single browser but blocks everything that needs data *across* users or *across* devices:

- **Real leaderboard** — currently rebuilt by listing every `users/*/lp_xp_*.json` blob and summing in JS (slow, fragile).
- **Compare vs. team/person** — parked since 2026-06-12; needs cross-user reads that don't exist.
- **Cross-device XP** — a user on a new laptop only gets their data back via the blob-hydration bootstrap, which has already caused one data-loss bug (the "25 XP reset").
- **Slack `/streak` & `/skills`** — hardcoded demo values; no per-user read.
- **The two-store blob mess** — `BLOB_READ_WRITE_TOKEN` points at the *empty* `learning-platform-data` orphan; real data lives in `learning-agent-blob`. A real DB retires this ambiguity.

Supabase (managed Postgres) becomes the **single source of truth** for user data, keyed by Okta email.

---

## 2. Design principle: hybrid, not table-per-blob

The inventory found **16+ per-user data types**. Turning each into a bespoke relational table is a large, risky rewrite for little gain — most of them are *documents the client reads and writes whole* and are never queried across users.

**So we split by access pattern:**

| Tier | Data | Storage | Why |
|---|---|---|---|
| **Relational** (queried across users / aggregated) | XP events, profiles | Proper tables + indexes | Leaderboard, compare, Slack, admin all need SQL aggregation here |
| **Document** (read/written whole, per-user only) | badges, lessons, paused lessons, notifications, goals, game state, chat, calibration, impact scores, library usage, module progress, curriculum findings/proposals/patches | One `user_documents` table, JSONB payload keyed `(email, doc_type)` | Zero shape changes; migrates the whole long tail by changing **one** route |
| **System / global** | admin allowlist, notify allowlist, org structure, leaderboard cache, xp-reset epoch | `system_documents` table (or keep in blob) | Not per-user; low churn |

**The payoff:** the central `/api/user-data` route (which handles GET/POST/DELETE for *every* document type) gets **one** implementation swap from blob → `user_documents`. Every one of those 14 document types migrates at once, with identical JSON shapes, so no client code changes. XP and profiles get promoted to real tables *in addition*, because that's the only place cross-user SQL earns its keep.

---

## 3. Schema (proposed DDL)

```sql
-- ─────────────────────────────────────────────────────────────
-- TIER 1: RELATIONAL (cross-user queries live here)
-- ─────────────────────────────────────────────────────────────

-- One row per user. Keyed by Okta email (the verified identity).
create table profiles (
  email            text primary key,          -- Okta session email, @housecallpro.com
  learner_id       text,                       -- legacy resolveLearnerId value (usually == email)
  display_name     text,
  name             text,
  department       text,
  sub_team         text,
  tier             text,
  avatar           text,
  onboarded        boolean default false,
  goals            jsonb default '[]',         -- string[] (newer multi-goal format)
  preferred_tools  jsonb default '[]',
  role_history     jsonb default '[]',
  scheduled_role_change jsonb,
  role_changed_at  timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Append-only XP ledger. This is what the leaderboard/compare aggregate.
create table xp_events (
  id          text primary key,               -- keep the client "xp_<ts>_<rand>" id (idempotent inserts)
  email       text not null references profiles(email) on delete cascade,
  source      text not null,                  -- lesson_complete | game_complete | first_login | ...
  amount      integer not null default 0,
  created_at  timestamptz not null default now(),
  meta        jsonb default '{}'
);
create index xp_events_email_created_idx on xp_events(email, created_at);
create index xp_events_source_idx on xp_events(email, source);   -- for one-time-award guards

-- ─────────────────────────────────────────────────────────────
-- TIER 2: DOCUMENT (per-user, read/written whole — the long tail)
-- ─────────────────────────────────────────────────────────────
create table user_documents (
  email       text not null,
  doc_type    text not null,                  -- 'lp_badges' | 'lp_lessons' | 'learner_goals' | ...
  data        jsonb not null default 'null',
  updated_at  timestamptz default now(),
  primary key (email, doc_type)
);

-- ─────────────────────────────────────────────────────────────
-- TIER 3: SYSTEM / GLOBAL (not per-user)
-- ─────────────────────────────────────────────────────────────
create table system_documents (
  key         text primary key,               -- 'admin_allowlist' | 'notify_allowlist' | 'xp_reset' ...
  data        jsonb not null,
  updated_at  timestamptz default now()
);
```

**Notes**
- **`xp_events.id` is the client-generated id** → inserts are naturally idempotent (`on conflict (id) do nothing`), which safely preserves the existing one-time-award guards (`first_login`, `first_quest`) that the app enforces by scanning the XP log. No separate `one_time_awards` table needed.
- **`profiles.email` is the FK anchor.** Because Okta login is now required, every writer already has a verified email — no more `demo@housecallpro.com` fallback in production.
- **`user_documents.data` is `jsonb`** so the shapes stay byte-for-byte what the client already sends. Migration = copy the blob JSON in verbatim.

---

## 4. Row-Level Security (RLS)

The app talks to Supabase **only from server-side API routes** (Next.js route handlers), using the **`service_role` key**. The browser never holds a Supabase key.

- Enable RLS on all tables (default-deny).
- Add a single `service_role` full-access policy per table (mirrors Rachel's prototype pattern).
- Because the server already authenticates the user via Okta and scopes every query by `email`, we do **not** expose the `anon` key to the client or rely on Supabase Auth. Okta remains the identity system; Supabase is pure storage.

*(If we ever want the browser to talk to Supabase directly, we'd wire Supabase Auth to the Okta JWT — out of scope for this migration.)*

---

## 5. Migration strategy — dual-write, then cut over

Zero-downtime, no data-loss window. Four stages:

### Stage 1 — Stand up (no behavior change)
- Create the Supabase project, run the DDL above.
- Add env vars (§7). Install `@supabase/supabase-js`.
- Add `lib/supabase.js` (server-only client from `service_role` key).
- **No route reads from Supabase yet.** App behaves exactly as today.

### Stage 2 — Dual-write (blob stays source of truth)
- In `/api/user-data` POST (and the admin XP writers), **write to both** blob and Supabase.
- Reads still come from blob. If a Supabase write fails, log and continue — blob is still authoritative, so nothing breaks.
- Let this bake for a few days; watch that Supabase rows accumulate and match.

### Stage 3 — Backfill + flip reads
- One-time backfill script: for every `users/<email>/*.json` blob in **`learning-agent-blob`** (the real store), upsert into `profiles` / `xp_events` / `user_documents`.
- Verify counts (blob file count vs. row count; spot-check a few users incl. yours + Brian's).
- Flip `/api/user-data` GET, `/api/leaderboard`, and `/api/admin/user` to **read from Supabase**. Blob still dual-written as a safety net.
- **Leaderboard becomes a single SQL aggregation** instead of list-all-blobs-and-sum — big speedup, kills the 5-min cache fragility.

### Stage 4 — Decommission blob writes
- After a stable period, stop writing per-user blobs.
- Keep the blob store around (read-only archive) for a while; **never delete `learning-agent-blob`** until we're confident.
- This is also when the **two-store orphan** problem dies: user data no longer depends on which store `BLOB_READ_WRITE_TOKEN` resolves to.

---

## 6. What this unblocks (post-migration)

| Feature | How Supabase enables it |
|---|---|
| **Real leaderboard** | `select email, sum(amount) ... group by email order by ...` — one query, no blob listing |
| **Compare vs. team/person** | Aggregate `xp_events` joined to `profiles.department` / org roster |
| **Cross-device XP** | Server reads the ledger by email — same data on any device, no hydration race |
| **Slack `/streak` `/skills`** | Per-user reads from `xp_events` + `user_documents(doc_type='calibration')` |
| **Admin/manager reporting** | SQL over `profiles` + `xp_events`, joined to the Snowflake org structure |

---

## 7. Env vars (when we implement — same safe pattern as Okta)

Set in **Vercel → learning-agent → Production** (you add them in the dashboard; I never touch the secret):

| Var | What | Sensitive? |
|---|---|---|
| `SUPABASE_URL` | Project URL (`https://<ref>.supabase.co`) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side full-access key | **YES — mark Sensitive** |
| `SUPABASE_ANON_KEY` | (optional) only if the client ever talks to Supabase directly | No |

The `service_role` key is the Supabase equivalent of the Okta secret — it stays server-side, never `NEXT_PUBLIC_`, never in the transcript.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Transaction boundaries** — today XP + badges + lessons are 3 separate blob writes | In Supabase these can be a single transaction per user action; at minimum they're 3 upserts to durable storage instead of lossy async blob PUTs |
| **One-time award double-grant** (`first_login`) | `xp_events.id` PK + `on conflict do nothing`; the app's existing log-scan guard still works because the ledger is intact |
| **Backfill from the wrong blob store** | Backfill MUST run against `learning-agent-blob` (real data), NOT the `learning-platform-data` orphan the CLI token points at. Run it through the live runtime or with an explicit store token, and verify against a known user first |
| **Email key drift** | Okta email is now the canonical key; soft-login used the same `users/<email>/` scheme, so keys line up. Spot-check that pre-Okta emails match Okta emails (they should — both are `@housecallpro.com`) |
| **Silent Supabase write failure during dual-write** | Log failures; blob remains authoritative through Stage 3, so a dropped Supabase write is recoverable by re-backfill |

---

## 9. Phasing (matches the "stand up → profiles → XP → cross-user" ladder)

1. **Stand up + profiles** (Stages 1–2 for `profiles` only) — lowest risk, proves the pipe.
2. **XP / progress** (extend dual-write to `xp_events` + `user_documents`) — unblocks cross-device.
3. **Cut reads over + cross-user** (Stage 3) — lights up leaderboard + compare.
4. **Decommission blob** (Stage 4) — retires the two-store mess.

We can stop and evaluate after any rung.

---

## 10. Decisions (confirmed 2026-07-01)

1. **Supabase project — EXISTS.** Project ref `knfubklmbkwgghitesqf`; API base `https://knfubklmbkwgghitesqf.supabase.co`. Stage 1 starts with running the DDL, not provisioning. Keys come from Settings → API; `service_role` goes into Vercel marked Sensitive (never in chat).
2. **Preserve existing progress/XP — YES.** The Stage-3 backfill is in scope and must read from `learning-agent-blob` (real store), verified against known users before flipping reads. No fresh start.

### Still open
- **Region** — any data-residency requirement? (Project already created, so likely already set — just confirm it's a US region near Vercel.)
- **First implementation pass scope** — rung 1 (profiles only) vs. rung 2 (profiles + XP). Recommendation: **rung 2**, since preserving XP + unblocking cross-user features is the whole point, and dual-write makes it just as safe as rung 1.

---

*No code has been written and no data moved. This is a plan for review. Once you're happy with the shape and answer §10, I'll start at Stage 1.*
