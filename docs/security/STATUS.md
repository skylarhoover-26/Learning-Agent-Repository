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

## F-05 is the one still open

Switching `access: 'public'` → `'private'` in `lib/blob-store.js` changes how
every read works, not just the writes — existing blobs stay public, and the
read path (`list()` + `fetch(downloadUrl)`) needs reworking for token-authorized
access. That is a migration with a real chance of breaking all user-data reads,
so it wants its own change and its own verification pass rather than riding
along with the rest. Mitigating factor, unchanged since the review: blob URLs
carry a per-store random component, so this is exposure-on-URL-leak, not open
enumeration.

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
