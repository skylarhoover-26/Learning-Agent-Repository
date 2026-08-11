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
| F-05 | Medium | Blobs written `access: 'public'` | **Closed for media 2026-08-11** — recordings live in a private store, served only via the admin-gated `/api/feedback/media` proxy; old public URLs 404. ~52KB of stale JSON is still public, see below |
| F-06 | Medium | Cookie missing HttpOnly/Secure | **Fixed** — resolved by F-01; session is a server-issued HttpOnly JWT |
| F-09 | Medium | Unauth cost amplification on `curriculum/{scan,curate}` | **Fixed 2026-08-11** — admin-gated by the F-07 fix. Rate limiting still not implemented (admin-only surface now, so the exposure is internal) |
| F-10 | Medium | Prompt injection via RSS titles | **Fixed 2026-08-11** — `lib/content-safety.js` delimits titles in `<untrusted>`, strips angle brackets, and range-checks the model's indices; `isSafeUrl()` in `lib/parse-feed.js` drops non-http(s) links |
| F-11 | Low | `/api/slack` GET leaks env presence | **Fixed 2026-08-11** — `configured` field removed |

## F-05 — what is actually stored, and why media comes first

An inventory of the store on 2026-08-11 reframed this finding:

| What | Count | Size | Last written |
|---|---|---|---|
| `feedback-recordings/` — screen recordings | 3 | **18.6 MB** | 2026-08-08 |
| `audit/` — activity log entries | 130 | 0.05 MB | 2026-07-15 |
| `users/` — profile, XP, calibration, notifications (**one user**) | 6 | 0.002 MB | 2026-07-14 |
| `leaderboard/cache.json` | 1 | 0.0001 MB | 2026-07-15 |

The JSON is ~52KB of month-old data for a single user — Supabase owns the live
path now. **The screen recordings are the real exposure**: they are captures of
someone using the app, so they can show names, emails and other people's data,
and they were world-readable to anyone holding the URL.

(Worth a look on its own: JSON blob writes stopped around 2026-07-14/15 even
though the code still calls `saveUserData` and the leaderboard cache has a
60-second TTL. Either those paths went Supabase-only or blob writes have been
failing silently. Not blocking, but unexplained.)

So media was done first. `lib/blob-media.js` writes media to the private store,
`/api/feedback/media/[...path]` streams it back behind an admin check, and
`mediaProxySrc()` maps stored URLs onto that route. Because the proxy resolves by
**pathname**, reading private-then-public, no stored feedback record ever needs
rewriting and media uploaded either side of the cutover keeps working. Range
headers are forwarded so `<video>` seeking still works.

## F-05 — how it was actually fixed

**The blocker, verified 2026-08-11.** A Vercel Blob store's access mode is fixed
**at store creation** (`vercel blob create-store --access public|private`); there
is no command to change it afterwards. The store this project uses is public:

```
Blob Store: learning-agent-blob (store_L4ADQJeZg88HnC3u)
Access: Public    Size: 31.63MB    Region: iad1
```

So `put(..., access: 'private')` against it throws
`Cannot use private access on a public store`. A first attempt shipped exactly
that and broke every write in production (`105d587`, reverted by `62aac30`).
Neither `next build` nor `npm run lint` catches it — it is a runtime API
rejection — and the app looked healthy afterwards because reads fell back to the
public path while writes failed silently.

**The design: two stores.** A private store holds the JSON; the existing public
store keeps feedback screenshots and recordings, which the admin UI renders
through `<img>`/`<video>` src and which therefore cannot be private without an
authenticated proxy. Access is a store-level property, so this split is the only
way to have both without writing that proxy.

**The gate.** `lib/blob-json.js` keys off `PRIVATE_READ_WRITE_TOKEN`:

- unset → public writes to the default store, i.e. today's exact behaviour
- set → JSON reads and writes go to the private store, with a public-read
  fallback for anything not yet copied across

That makes the code safe to deploy on its own, and makes the cutover *and the
rollback* a single environment-variable change rather than a redeploy.

**Cutover order** (each step verifiable, nothing destructive until the last):

1. `vercel blob create-store learning-agent-private --access private`
2. Add its token to Vercel as `PRIVATE_READ_WRITE_TOKEN`. **Do not touch
   `BLOB_READ_WRITE_TOKEN`** — that is the media store and the fallback path.
3. `node scripts/migrate-media-private.mjs --dry-run`, then for real, then
   `--verify`. Copies only — it never deletes. The JSON equivalent
   (`migrate-blobs-private.mjs`) is optional; see the inventory above.
4. Deploy, then in the admin feedback UI confirm a **screenshot renders and a
   recording plays and seeks**. That exercises the proxy, the private read, and
   Range forwarding in one go.
5. Confirm an anonymous request to `/api/feedback/media/<path>` is refused, and
   that the old public blob URL 404s once cleanup has run.
6. Only then `--cleanup`, which deletes the public originals and refuses any blob
   without a matching private copy.

**Smoke-test before deploying:** write one private blob, read it back, and
confirm an anonymous fetch of its URL is refused. That check takes seconds and
would have caught the first attempt.

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


## F-05 — final state (2026-08-11)

**Done.** `learning-agent-private` (`store_fEhggtHfo7UNJxrz`, Access: Private) is
connected to the project with prefix `PRIVATE`, giving `PRIVATE_READ_WRITE_TOKEN`.
Note Vercel's connect flow **replaces** `BLOB` in the default names rather than
prepending, so prefix `PRIVATE` yields `PRIVATE_READ_WRITE_TOKEN`, not
`PRIVATE_BLOB_READ_WRITE_TOKEN`.

All three screen recordings (18.6MB) were copied to the private store, verified
byte-for-byte, confirmed playing and seeking in the admin UI, and the public
originals deleted. Their old URLs now return 404.

Verified against the live store before deploying — the step the first attempt
skipped: private write OK, authenticated read OK, **anonymous fetch of the blob
URL → 403**, range read returns `content-range`.

**Two bugs that only showed up in that testing**, both fixed in `72aef56`:
- Copies land as `application/octet-stream` (`list()` doesn't carry a content
  type through) and `<video>` refuses to play that. Type is now derived from the
  extension on both copy and serve.
- The SDK reports `statusCode` 200 even when storage satisfies a Range request.
  A 200 carrying a partial body breaks seeking. The proxy now returns 206 when a
  range was requested and `content-range` came back.

**What is still public:** ~52KB of JSON — `users/` (6 files, one user),
`audit/` (130 entries), `leaderboard/cache.json`, all last written 2026-07-14/15.
Supabase owns the live path for this data. `scripts/migrate-blobs-private.mjs`
will move it, but deleting it may be the better answer — confirm nothing reads it
first. Unexplained and worth a look on its own: those blob writes stopped a month
ago even though the code still calls `saveUserData`.

**Rollback**, if media ever misbehaves: unset `PRIVATE_READ_WRITE_TOKEN` in
Vercel. No redeploy needed — but note the public originals are now deleted, so
media would 404 until the token is restored.
