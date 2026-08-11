# Security review — finding status

Tracks the findings from `security-review-learning-agent-repository-2026-06-10.md`
(a re-review of the 2026-06-05 pass, which is not checked in).

Status column verified against the code on **2026-08-11**, branch `batch/aug-11`.
Re-verify before trusting this table — it is a snapshot, not a live check.

| ID | Severity | Title | Status |
|---|---|---|---|
| F-01 | Critical | Identity is a client-set cookie | **Fixed** — Okta SSO live 2026-07-01 (`auth.js`, `middleware.js`) |
| F-02 | High | `/api/user-lookup` unauth PII | **Fixed** — route deleted |
| F-03 | High | Slack signature verification dead code | **Fixed** — enforced at `app/api/slack/route.js:245`; `response_url` host pinned to `hooks.slack.com` (line 124) |
| F-04 | High | `MANAGER_DATA_SECRET` fail-open | **Fixed** — fails closed with 503 + `timingSafeEqual` (`app/api/manager-data/route.js:25-30`) |
| F-07 | High | Admin gate decorative; admin APIs unauth | **Partial** — `requireAdmin()` guards `app/api/admin/*`, but `/api/curriculum/scan` and `/api/curriculum/curate` still have no server-side check |
| F-08 | High | `CRON_SECRET` fail-open on the daily cron | **Open** — `app/api/curriculum/daily/route.js:170` still uses `authHeader !== \`Bearer ${process.env.CRON_SECRET}\``, which matches the literal `Bearer undefined` when the var is unset. Same pattern at `app/api/reporting/refresh/route.js:12` (that one is behind the SSO middleware) |
| F-05 | Medium | Blobs written `access: 'public'` | **Open** — `lib/blob-store.js:32` and `app/api/curriculum/daily/route.js:51` |
| F-06 | Medium | Cookie missing HttpOnly/Secure | **Fixed** — resolved by F-01; session is a server-issued HttpOnly JWT |
| F-09 | Medium | Unauth cost amplification on `curriculum/{scan,curate}` | **Open** — no auth, no rate limiting |
| F-10 | Medium | Prompt injection via RSS titles | **Open** — no untrusted-region delimiters in the safety-filter prompt; `lib/parse-feed.js:92` accepts any `<link>` value with no scheme validation |
| F-11 | Low | `/api/slack` GET leaks env presence | **Open** — `configured` field still returned (`app/api/slack/route.js:328`) |

## The middleware exclusion matters here

`middleware.js:21` excludes `api/curriculum` from the SSO matcher, so the
`scan`, `curate`, and `daily` routes are **not** covered by Okta. F-07, F-08,
F-09, and F-10 all live on those paths and are reachable anonymously today.
Everything else in the app is gated.

The blast radius for F-08 depends on whether `CRON_SECRET` is set in every
environment — set in prod means prod is safe and previews are not. That was
open question #1 in the review's section E and has never been answered in
writing.

## What the review does *not* say

It prescribes **no session lifetime**. F-01 asks for a server-issued signed
session and F-06 asks for HttpOnly/Secure flags; neither mentions `maxAge`,
30 days, or an idle window. The 8-hour sliding session in `auth.js:35` was a
judgment call made on 2026-07-01, not a security requirement — it can be tuned
without reopening a finding.
