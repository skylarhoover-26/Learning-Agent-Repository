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
| F-05 | Medium | Blobs written `access: 'public'` | **OPEN** — `lib/blob-store.js:32`, `app/api/curriculum/daily/route.js:52`. See below |
| F-06 | Medium | Cookie missing HttpOnly/Secure | **Fixed** — resolved by F-01; session is a server-issued HttpOnly JWT |
| F-09 | Medium | Unauth cost amplification on `curriculum/{scan,curate}` | **Fixed 2026-08-11** — admin-gated by the F-07 fix. Rate limiting still not implemented (admin-only surface now, so the exposure is internal) |
| F-10 | Medium | Prompt injection via RSS titles | **Fixed 2026-08-11** — `lib/content-safety.js` delimits titles in `<untrusted>`, strips angle brackets, and range-checks the model's indices; `isSafeUrl()` in `lib/parse-feed.js` drops non-http(s) links |
| F-11 | Low | `/api/slack` GET leaks env presence | **Fixed 2026-08-11** — `configured` field removed |

## F-05 is the one still open — and it is BLOCKED ON STORE CONFIGURATION

**Read this before writing any code for F-05.** It was attempted and reverted on
2026-08-11 (`105d587`, reverted by `62aac30`). The attempt failed for a reason no
amount of application code can fix:

```
Vercel Blob: Cannot use private access on a public store.
The store must be configured with private access.
```

The blob store behind this project (`xhnmqsy93cya2unk`, prod `BLOB_STORE_ID`
`store_L4ADQJeZg88H…`) is a **public store**. Every `put(..., access: 'private')`
against it throws. Verified directly against the production token: a public write
succeeds, a private write fails with the error above.

Neither `next build` nor `npm run lint` catches this — it is a runtime API
rejection — and the app *appeared* fine after deploying because reads fell back to
the public path. Only writes broke, and most write sites swallow their errors.

**So F-05 is a storage-configuration task first, a code task second:**

1. Determine whether Vercel can convert this store to private access, or whether a
   new private store plus a data migration is required. Note the store is shared —
   see the two-store note in the project memory.
2. Only then port the code. The reverted commit's approach was sound: one
   `lib/blob-json.js` doing private writes and authenticated `get()` reads by
   pathname, with a legacy public-read fallback, plus a migration script for
   existing blobs (`access` is a property of the stored object, so old blobs stay
   public until rewritten).
3. Feedback screenshots and recordings must stay public regardless, or gain an
   authenticated proxy route — the admin UI renders them via `<img>`/`<video>` src.
4. **Smoke-test against the real store before deploying**: write one private blob,
   read it back, confirm an anonymous fetch of its URL is refused.

Mitigating factor, unchanged since the review: blob URLs carry a per-store random
component, so the residual exposure is read-if-a-URL-leaks, not enumeration.

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
