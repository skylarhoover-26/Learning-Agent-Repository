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
| F-05 | Medium | Blobs written `access: 'public'` | **CLOSED 2026-08-13** — both public stores are now empty (0 blobs each) and every previously-readable URL returns 404. All 5,657 blobs live in `learning-agent-private`, which returns 403 anonymously. Includes 69 feedback screenshots (27.58 MB) that the 2026-08-11 "closed for media" claim had missed |
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

## F-05 — JSON cleanup completed 2026-08-13

Ran against the linked store with both production tokens:

```
migrate  : copied 130, already present 7, failed 0
verify   : 130 identical, 0 missing, 7 differing
cleanup  : deleted 137 public copies, refused 0
```

Public store `learning-platform-data` is now **0 blobs**. The exact URL the
verification report fetched anonymously — `users/<email>/profile.json`, which
returned HTTP 200 with real profile PII — now returns **404**, as do
`leaderboard/cache.json` and a sampled audit entry.

**The 7 "differing" blobs were not a problem, and it is worth recording why.**
They are the 7 that already had private copies, because the live app has been
writing them there since the 2026-08-11 cutover. The private side is newer in
every case:

| Blob | Public (stale, Jul) | Private (live) |
|---|---|---|
| `lp_xp_<email>.json` | `array[1]` | `array[4]` |
| `leaderboard/cache.json` | generated 2026-07-15 | generated 2026-08-13 |
| `calibration_history.json` | `array[1]` | `array[4]` |
| `lp_notifications.json` | `array[1]` | `array[6]` |
| `calibration_profile.json` | has `selfRating` | has `measuredKeys` (schema changed) |

What the public copies held that private did not: one superseded July
calibration snapshot, one old notification, and the pre-schema-change
`selfRating` field. Reads have been private-first since the cutover, so the app
had already stopped seeing any of it. A full byte-verified local backup of all
137 blobs was taken before deleting.

**Ordering mistake worth not repeating.** The runbook below says to run cleanup
*after* deploying the store-aware listing. It was run before. Consequence, until
`41d8c74` ships: the deployed code lists only the public store, which is now
empty, so the admin reporting page enumerates zero learners and the audit log
shows nothing. Learner-facing surfaces are unaffected — they read Supabase.
Deploying resolves it; no data is lost either way, since everything is in the
private store.

## Obs: the 2026-07-15 write gap — resolved for current state

Listing the private store settled what the repo alone could not. It holds 969
blobs with writes on 2026-08-11, 08-12 and 08-13 — 165 today across `audit/`,
`users/`, `shared/`, `daily/`, `config/`, `leaderboard/`, `reporting/` and
`manager-data/`. **Writes are healthy and current.**

The private store was created on 2026-08-11, so it cannot hold anything older,
and the public store's last write was 2026-07-15. The ~4 weeks between remain
genuinely empty in both stores — historical audit-log coverage that no longer
exists anywhere. Not worth further archaeology: user data was dual-written to
Supabase throughout, so the loss is audit history for that window, and
`/api/admin/blob-health` now makes a recurrence visible within one request.

## F-05 — the second store, found and closed 2026-08-13

The project had **two** public blob stores. Every prior pass — the 2026-06-10
review, the 2026-08-13 verification, and the inventory earlier in this document
— examined only `learning-platform-data`, because that is what the project link
and a `vercel env pull` token resolve to.

| Store | Size before | Contents |
|---|---|---|
| `learning-platform-data` | 50 KB / 137 blobs | an orphan; last written 2026-07-15 |
| `learning-agent-blob` | **31.61 MB / 5,520 blobs** | the store production actually wrote to |

`learning-agent-blob` held `audit/` running **2026-06-09 → 2026-08-11
continuously**, `users/` data for **24 people**, 191 `feedback/` records, and
**69 `feedback-screenshots/` totalling 27.58 MB**. All anonymously readable.

Two earlier conclusions in this document were wrong because of this:

- **The "2026-07-15 write gap" never existed.** Writes were healthy the whole
  time, going to `learning-agent-blob`. `learning-platform-data` is the store
  that went quiet — it is an orphan, not the live one. The probe test that
  "confirmed the gap is real" was sound but pointed at the wrong store.
- **"Closed for media" was not true.** The 2026-08-11 migration moved 3
  `feedback-recordings/`; it never touched the 69 screenshots in this store.
  Screenshots are screen captures, so the same reasoning that made recordings
  the priority applied to them all along.

`docs/GOTCHAS.md` had this right on 2026-07-30 — "`BLOB_STORE_ID` does NOT
describe the store the app uses… the token production actually runs with
resolves to a *different* store." Both stores are connected to the project, so
the runtime value and the pulled value differ. Trust that note.

### What was done

1. Full byte-verified local backup of all 5,520 blobs (0 missing, 0 mismatches).
2. JSON copied to the private store: 4,977 copied, 474 already present, 0 failed.
3. Media copied: 69 screenshots, 27.58 MB, verified 69 matching / 0 mismatches.
4. Byte-verify of all 5,451 JSON blobs: **5,353 identical, 0 missing, 98 differing.**
5. The 98 were analysed rather than assumed. 68 were Supabase round-trip
   artefacts — same `id`, `…959Z` vs `…959+00:00`, plus an added `meta: {}`.
   **19 records existed only in the archive**, because the migration script is
   copy-if-absent, not merge, so blobs already present in private never received
   the archive's extra entries.
6. The 8 substantive records were merged into the private store using the app's
   own `mergeLedger` (union by identity, stored copy wins a collision):

   | Restored | |
   |---|---|
   | bridget | `first_goal` badge, calibration snapshot |
   | brian | `first_lesson` badge, lesson-history record, calibration snapshot |
   | skylar | calibration snapshot |
   | kate, azeret | paused-lesson state |

   A 9th (brian's `first_goal`) deduped on `badge_id` — he already held it under
   a different timestamp. Left behind by choice: 5 cosmetic notifications, 3
   legacy `audit/2026-06-30.json` entries, and 2 pre-schema-change `selfRating`
   fields, all preserved in the local backup.
7. Deleted: 69 media + 5,451 JSON, **refused 0** — the cleanup scripts verify a
   private copy exists per blob before deleting.

### Final state

```
learning-agent-blob      0 blobs      (was 5,520 / 31.61 MB)
learning-platform-data   0 blobs      (was   137 / 50 KB)
learning-agent-private   6,392 blobs / 61.44 MB
```

Anonymous fetches of `audit/2026-06-30.json`, `config/xp-reset.json`,
`users/<email>/profile.json` and a screenshot all return **404**. The private
store returns **403**.

Both empty public stores are retained deliberately: `learning-agent-blob` is
still the Stage-3 Supabase backfill source named in
`docs/SUPABASE-MIGRATION-PLAN.md`, and deleting either risks re-provisioning the
store connection (see `docs/GOTCHAS.md`). Empty and public is fine; the data is
what mattered.

## The 2026-07-15 write gap — WITHDRAWN, there was no gap

This section previously argued the gap was real and listed four ruled-out
causes. It was wrong, and is kept only so the reasoning error is visible.

The error: every measurement was taken against `learning-platform-data`, which
is an orphan store. Production was writing to `learning-agent-blob` throughout,
where `audit/` runs continuously from 2026-06-09 to 2026-08-11. Nothing stopped.
The probe test (overwrite advances `uploadedAt`, so the July timestamps are real)
was correct in itself — it just proved the orphan went quiet, not that writes had.

Also withdrawn: the claim that four weeks of audit history was lost. All 4,975
entries were in the archive and are now in the private store.

`/api/admin/blob-health` is still worth having — it reports per-store, so the
next person cannot make this mistake silently — and the `del`-then-`put`
read-after-write bug it surfaced (`3aceceb`) is unrelated and real.

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
