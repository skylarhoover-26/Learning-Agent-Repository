# Security review — finding status

Tracks the findings from `security-review-learning-agent-repository-2026-06-10.md`
(a re-review of the 2026-06-05 pass, which is not checked in).

Status column verified against the code on **2026-08-11**, branch `batch/aug-11`.
Re-verify before trusting this table — it is a snapshot, not a live check.

| ID | Severity | Title | Status |
|---|---|---|---|
| F-01 | Critical | Identity is a client-set cookie | **Fixed** — Okta SSO live 2026-07-01 (`auth.js`, `middleware.js`) |
| F-02 | High | `/api/user-lookup` unauth PII | **Fixed** — route deleted |
| F-03 | High | Slack signature verification dead code | **Fixed** — enforced at `app/api/slack/route.js:245`; `response_url` host pinned to `hooks.slack.com` |
| F-04 | High | `MANAGER_DATA_SECRET` fail-open | **Fixed** — fails closed with 503 + `timingSafeEqual` |
| F-07 | High | Admin gate decorative; admin APIs unauth | **Fixed 2026-08-11** — `lib/require-admin.js` guards `scan`, `curate`, `apply`; `proposals`/`scan-now` already guarded; matcher narrowed so all of them sit behind SSO too |
| F-08 | High | `CRON_SECRET` fail-open on the daily cron | **Fixed 2026-08-11** — `lib/cron-auth.js` fails closed (503) with `timingSafeEqual`; used by `curriculum/daily` and `reporting/refresh` |
| F-05 | Medium | Blobs written `access: 'public'` | **Fixed for JSON 2026-08-11** — all JSON stores write private via `lib/blob-json.js` and read through the authenticated SDK. Feedback media still public — see below |
| F-06 | Medium | Cookie missing HttpOnly/Secure | **Fixed** — resolved by F-01; session is a server-issued HttpOnly JWT |
| F-09 | Medium | Unauth cost amplification on `curriculum/{scan,curate}` | **Fixed 2026-08-11** — admin-gated by the F-07 fix. Rate limiting still not implemented (admin-only surface now, so the exposure is internal) |
| F-10 | Medium | Prompt injection via RSS titles | **Fixed 2026-08-11** — `lib/content-safety.js` delimits titles in `<untrusted>`, strips angle brackets, and range-checks the model's indices; `isSafeUrl()` in `lib/parse-feed.js` drops non-http(s) links |
| F-11 | Low | `/api/slack` GET leaks env presence | **Fixed 2026-08-11** — `configured` field removed |

## F-05 — what shipped, and what is left

Every JSON store now writes `access: 'private'` and reads through
`lib/blob-json.js`, which uses the authenticated `get()` SDK path. That covers
user profiles, XP, lessons, badges, the leaderboard cache, audit entries, org
data, daily lessons, curriculum findings/proposals, feedback records, and the
reporting snapshot.

**Two caveats, both deliberate:**

1. **Existing blobs stay public until rewritten.** `access` is a property of the
   stored object, so the switch only protects data as it is written. `readJsonBlob`
   falls back to the legacy public fetch so nothing breaks in the meantime.
   Run `scripts/migrate-blobs-private.mjs` (supports `--dry-run`) against the
   real store to flip the backlog. **Until that has run, F-05 is only closed for
   newly-written data.** Once it has, the fallback in `lib/blob-json.js` can go.

2. **Feedback media is still public** — `lib/feedback-upload.js` (recordings) and
   the screenshot write in `lib/feedback-store.js`. The admin UI renders these
   through `<img>` / `<video>` src, which cannot carry an auth header, and the
   recording upload happens browser-side. Closing this needs an authenticated
   media proxy route; it is not a find-and-replace.

Unchanged mitigating factor from the review: blob URLs carry a per-store random
component, so the residual exposure is read-if-a-URL-leaks, not enumeration.

## Verify F-05 on a preview deploy before trusting it

This change touches every read of user data. `next build` cannot exercise it —
the local env token points at the empty `learning-platform-data` store, not the
`learning-agent-blob` store that holds real data. On a preview deploy, confirm:
profile loads, XP total is correct, leaderboard renders, `/reporting` populates,
AI news card fills, and admin feedback lists records.

## Cron paths and the middleware matcher

Every cron path in `vercel.json` must appear in the `middleware.js` matcher
exclusion list. A Vercel cron sends a `CRON_SECRET` bearer token and no session
cookie, so any cron path the matcher catches gets 302'd to `/auth/signin` and
the job silently does nothing.

Found this way on 2026-08-11: `/api/reporting/refresh` and
`/api/model-lineup/refresh` were both missing from the list and had been
returning 302 in production — those two crons were not running. Both
authenticate themselves in-route, so they were added to the exclusion.

`CRON_SECRET` is confirmed set in the production environment (`vercel env ls
production`, 2026-08-11), so the fail-closed change does not break the prod
crons. Preview deploys without the var will now return 503 instead of running —
which is the intended behaviour.

## What the review does *not* say

It prescribes **no session lifetime**. F-01 asks for a server-issued signed
session and F-06 asks for HttpOnly/Secure flags; neither mentions `maxAge`,
30 days, or an idle window. The 8-hour sliding session in `auth.js:35` was a
judgment call made on 2026-07-01, not a security requirement — it can be tuned
without reopening a finding.
