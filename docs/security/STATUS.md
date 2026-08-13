# Security review — finding status

Tracks the findings from `security-review-learning-agent-repository-2026-06-10.md`
(a re-review of the 2026-06-05 pass, which is not checked in).

Status column verified against the code on **2026-08-11**, branch `batch/aug-11`.
Re-verify before trusting this table — it is a snapshot, not a live check.

> **2026-08-13.** An external verification pass
> (`security-verification-learning-agent-repository-2026-08-13.md`) checked all
> 11 findings and disputed two of this table's "Fixed" claims — F-05 and F-10.
> Both disputes were correct. See *2026-08-13 — verification response* at the
> bottom for what was actually wrong, what has since been fixed, and the one
> item still open.

| ID | Severity | Title | Status |
|---|---|---|---|
| F-01 | Critical | Identity is a client-set cookie | **Fixed** — Okta SSO live 2026-07-01 (`auth.js`, `middleware.js`) |
| F-02 | High | `/api/user-lookup` unauth PII | **Fixed** — route deleted |
| F-03 | High | Slack signature verification dead code | **Fixed** — enforced at `app/api/slack/route.js:245`; `response_url` host pinned to `hooks.slack.com` |
| F-04 | High | `MANAGER_DATA_SECRET` fail-open | **Fixed** — fails closed with 503 + `timingSafeEqual` |
| F-07 | High | Admin gate decorative; admin APIs unauth | **Fixed 2026-08-11** — `lib/require-admin.js` guards `scan`, `curate`, `apply`; `proposals`/`scan-now` already guarded; matcher narrowed so all of them sit behind SSO too |
| F-08 | High | `CRON_SECRET` fail-open on the daily cron | **Fixed 2026-08-11** — `lib/cron-auth.js` fails closed (503) with `timingSafeEqual`; used by `curriculum/daily` and `reporting/refresh` |
| F-05 | Medium | Blobs written `access: 'public'` | **Open, and larger than reported** — media is closed. 137 JSON blobs in the linked store are still world-readable, and a **second public store (`learning-agent-blob`, 31.61 MB) has never been reviewed at all** — it serves audit entries with name/email/department + AI inputs anonymously. See *a SECOND public store* below |
| F-06 | Medium | Cookie missing HttpOnly/Secure | **Fixed** — resolved by F-01; session is a server-issued HttpOnly JWT |
| F-09 | Medium | Unauth cost amplification on `curriculum/{scan,curate}` | **Fixed 2026-08-11** — admin-gated by the F-07 fix. Rate limiting still not implemented (admin-only surface now, so the exposure is internal) |
| F-10 | Medium | Prompt injection via RSS titles | **Fixed 2026-08-13** — the 2026-08-11 entry covered only `lib/content-safety.js`; six further prompts (including two unattended cron classifiers) were still taking feed text raw. All eight now quarantine via `lib/untrusted.js`. `isSafeUrl()` in `lib/parse-feed.js` drops non-http(s) links |
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
failing silently. Not blocking, but unexplained. — **Investigated 2026-08-13**:
confirmed real rather than a timestamp artifact, and four candidate causes ruled
out. See *The 2026-07-15 write gap* below.)

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

---

# 2026-08-13 — verification response

An external pass verified all 11 findings against this repo and production, and
marked two of the table's "Fixed" claims as only partially remediated. Both
challenges held up. This section records what was wrong and what changed.

## F-10 — was wider than either document said

The verification was right that the curator prompts still interpolated RSS
titles raw. Checking the rest of the pipeline found the same primitive in
**eight** places, not the two it named:

| Site | Prompt | Reachable as |
|---|---|---|
| `curriculum/curate` | curator | admin |
| `curriculum/daily` | curator | **cron, unattended** |
| `curriculum/daily` | daily lesson generator | **cron, unattended** |
| `curriculum/scan-now` | curator | admin |
| `curriculum/scan-now` | daily lesson generator | admin |
| `curriculum/apply` | content editor | admin |
| `lib/news-relevance` | relevance classifier | **cron, unattended** |
| `lib/skill-staleness` | staleness classifier | **cron, unattended** |

The last two were in neither the original finding's Affected Components nor the
verification, so no targeted re-check would have caught them. They are also the
worst of the set: `news-relevance` feeds the model a 160-character feed-written
*summary blurb* as well as the title, and `skill-staleness` acts on its own
output by marking skills stale — both on the daily cron with no human in the
loop.

`lib/untrusted.js` now holds the pattern `lib/content-safety.js` proved out
(strip angle brackets, wrap in `<untrusted>`, pair with a treat-as-data note in
the system prompt) and all eight sites use it. Verified against a title carrying
a `</untrusted>` escape attempt: the injected tag collapses to inert text and
the delimiters stay balanced.

Output validation was deliberately left alone — every one of these callers
already range-checks indices or checks categories against a fixed allowlist,
which is the other half of the defence and was already correct.

**Lesson for the table above:** "Fixed" was recorded against the file that was
patched (`lib/content-safety.js`), not against the finding's actual surface.

## F-05 — the JSON cleanup, and why it was not just a delete

Inventory re-confirmed on 2026-08-13, unchanged from 2026-08-11: 137 blobs —
130 `audit/`, 6 `users/` (one person), 1 `leaderboard/cache.json`, and **zero**
`feedback-recordings/`, so the media migration is genuinely complete.

Deleting the JSON was the agreed plan. It would have been destructive, because
of a bug the cutover introduced and nothing had noticed:

**Writes moved to the private store; discovery and deletion did not.** Every
`list()` and `del()` call site still used the bare SDK import, which resolves to
the public store. Reads were fine — `readJsonBlob` is private-first — so the app
looked healthy, but:

- `lib/audit-log.js` lists the public store, so **nothing written since the
  cutover is visible in the admin audit log**. Deleting the 130 public entries
  would have blanked it entirely.
- `lib/reporting.js` enumerates `users/` — it has been building the reporting
  page from six stale public blobs (one person) instead of every learner.
- `lib/blob-store.js`'s `listUserDataTypes`, so `team-scores` misses data.
- `reset-user`, `reset-all` and `reset-xp` delete only the public copy. The
  private copy survives and wins the next read, so a reset reports success and
  the data comes back. `reset-all`'s own comment promises otherwise.

Fixed by `listJsonBlobs` / `delJsonBlob` in `lib/blob-json.js`, which span both
stores; every call site moved onto them. `listJsonBlobs` also walks the cursor
to exhaustion when given no limit — the SDK's 1000-item default cap would have
silently dropped people off the reporting page as headcount grew.

**Still open:** the 137 public blobs are not yet deleted. The prerequisite is
now in place, so the remaining work is the documented runbook:

```bash
BLOB_READ_WRITE_TOKEN=<public> PRIVATE_READ_WRITE_TOKEN=<private> \
  node scripts/migrate-blobs-private.mjs            # copy (never deletes)
…same env… node scripts/migrate-blobs-private.mjs --verify
…same env… node scripts/migrate-blobs-private.mjs --cleanup
```

`--cleanup` refuses to delete any blob without a verified private twin, so the
audit history is copied across rather than lost. Run it after deploying the
store-aware listing, not before — otherwise the audit log has no reader that can
see the copies it just made.

## F-05 — a SECOND public store, never reviewed

**This is now the largest open item, and no security pass has looked at it.**

The project has two public blob stores, not one:

| Store | ID | Size | Created | Examined by the review? |
|---|---|---|---|---|
| `learning-platform-data` | `store_xHnmqSy93cYA2unk` | 50.18 KB | 2026-06-08 | yes — all 137 blobs, and the anonymous `curl` |
| `learning-agent-blob` | `store_L4ADQJeZg88HnC3u` | **31.61 MB** | 2026-06-04 | **no** |

Everything in the 2026-06-10 review, the 2026-08-13 verification, and the
inventory earlier in this document is the 50 KB store — it is the one the
project is linked to and the one `BLOB_READ_WRITE_TOKEN` reaches.

The 31.61 MB store is public and still serving. Fetched anonymously on
2026-08-13, no credentials:

```
GET https://l4adqjezg88hnc3u.public.blob.vercel-storage.com/audit/2026-06-30.json
HTTP 200
keys per entry : durationMs, endpoint, error, id, input, model, output,
                 timestamp, type, user
user object    : department, email, name, tier
```

So: audit entries carrying name, email, department and tier, alongside the input
and output of AI interactions — the same class of data F-05 is about, roughly
600× the volume that was reported, and outside the scope of every pass so far.
`/config/xp-reset.json` also returns 200 there, so the app was writing to this
store as recently as 2026-07-01.

**Before deleting anything from the 50 KB store, inventory this one.** Doing the
small cleanup first would close a 50 KB leak while a 31.61 MB one stays open,
and would make the tracker read as "F-05 closed".

Needed to proceed: a read-write token for `store_L4ADQJeZg88HnC3u` (it is not
connected to the project, so no env var points at it). With that,
`scripts/migrate-blobs-private.mjs` works against it unchanged.

Open question worth answering at the same time: which store production actually
writes to. `shared/` and `daily/` — written by the curriculum cron — are absent
from *both* public stores, which is not explained yet.

## The 2026-07-15 write gap — still unexplained, but no longer a guess

Both this document and the verification flagged that blob writes appear to have
stopped around 2026-07-14/15. Investigated on 2026-08-13:

**It is real, not a measurement artifact.** The obvious innocent explanation was
that these blobs are overwritten in place (`addRandomSuffix: false`,
`allowOverwrite: true`) and `uploadedAt` might just report first-creation.
Tested directly against the production public store — wrote a probe blob,
overwrote it three seconds later, and `uploadedAt` advanced (`…05Z` → `…08Z`).
Probe deleted. So the July timestamps mean what they appear to mean: **nothing
has reached the public store since 2026-07-15.**

Ruled out:

- *The private-store cutover moved them* — the tempting explanation, and wrong.
  Every F-05 commit is dated 2026-08-11 (`105d587`, `62aac30`, `cd2af75`); the
  private store did not exist in July. It does explain 2026-08-11 onward.
- *A dead or read-only token / a full store* — the probe write above succeeded
  with the production public token.
- *The missing `access` parameter* that silently broke `daily-lessons` writes —
  the pre-cutover `saveUserData` already passed `access: 'public'`.
- *A conditional write path* — `POST /api/user-data` calls `saveUserData`
  unconditionally on every sync, and `appendToLedger` does the same for XP.

That leaves roughly a month (2026-07-15 → 2026-08-11) where writes should have
gone to the public store and did not. It would have been invisible: Supabase is
read-first for user data, so the app behaves correctly either way, and the audit
log — the one surface that would have shown it — reads the store that stopped
receiving writes.

Closing this needs evidence not available from the repo: whether `users/` blobs
in the **private** store carry post-cutover timestamps, and Vercel runtime logs
from mid-July (retention permitting). Worth doing before `--cleanup`, since it
decides whether the public copies are redundant or the only copies.

Note the fix above changes the reporting page's inputs. If reporting starts
showing materially more people after the next deploy, that is this bug being
corrected, not new data appearing.

## F-06 — verify-agent observation, closed

The fallback `la_identity` cookie was `HttpOnly` + `SameSite=lax` but not
`Secure`. Production never reaches that path (Okta is configured, so
`POST /api/identity` returns 400), but Preview has no `AUTH_OKTA_ISSUER` and
still runs the soft login, so the cookie was being set without `Secure` on a
real hostname. Now set everywhere except `next dev`, and the `DELETE` handler
clears it with matching attributes.

## F-09 — unchanged, and still correct

Rate limiting remains unimplemented. The surface is admin-only, so the residual
risk is an authenticated admin abusing it. Recorded here so a future pass does
not read the omission as an oversight.
