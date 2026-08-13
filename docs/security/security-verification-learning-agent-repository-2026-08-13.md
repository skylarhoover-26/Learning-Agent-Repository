# AI Learning Platform — Remediation Verification
**Date:** 2026-08-13 | **Source Report:** security-review-learning-agent-repository-2026-06-10.md (commit `ad59a81`)
**Scope:** Targeted verification of 11 findings from the source report — not a fresh full-suite scan. Current `main` HEAD (`834f889`) is 734 commits ahead of the source report's commit.

A team-maintained tracker, `docs/security/STATUS.md` (dated 2026-08-11), already claims fixed status for every finding. This verification does not take that document on trust — every status below is backed by current code shown inline, and for F-05 by a live, anonymous fetch against production infrastructure performed during this pass (see F-05). Two items where `STATUS.md` claims "Fixed" are marked **Partially Remediated** here based on that direct evidence.

---

## Verification Summary

| Status | Count |
|---|---|
| Remediated | 9 |
| Not Remediated | 0 |
| Partially Remediated | 2 |
| Cannot Verify | 0 |
| **Total Findings Checked** | **11** |

**Still Open (Not Remediated + Partially Remediated + Cannot Verify):** 2 of 11 — F-05 (stale public PII blobs never migrated/deleted) and F-10 (curator prompt still unquarantined) should stay on the team's radar until a follow-up pass confirms them closed.

---

### [F-01] No real authentication; identity is a client-set cookie — **REMEDIATED**

**Confidence:** High — verified against live production configuration, not just code.

**Original Evidence (from source report):** `lib/profile-client.js` wrote a full profile object into `document.cookie`; `lib/profile.js` trusted it unconditionally.

**Current Code:**
- `lib/profile-client.js` and `lib/profile.js` no longer exist (confirmed via repo-wide search — no residual references anywhere).
- Identity now comes from `auth.js` (NextAuth + Okta provider, PKCE/state checks, JWT sessions, sign-in callback restricted to `@housecallpro.com`) via `getAuthenticatedUser()` in `lib/auth-helpers.js`.
- `middleware.js` enforces a valid session on every route not explicitly excluded (crons, `/api/auth`, `/api/slack`, `/api/manager-*`).

**Verification Command Run (live infrastructure, not just code):**
```
npx vercel env ls production
# AUTH_OKTA_ID       Preview, Production
# AUTH_OKTA_SECRET    Preview, Production
# AUTH_OKTA_ISSUER              Production   <- confirms oktaConfigured=true in prod
```
Since all three vars are set in Production, `oktaConfigured` is `true` there, which means:
- The forgeable fallback (`POST /api/identity`, a "soft login" that accepts any self-declared `@housecallpro.com` address with zero ownership verification) returns `400 { error: 'Sign-in is handled by SSO' }` in production — confirmed by reading `app/api/identity/route.js:20-23`.
- `components/identity-gate.jsx` (the UI for the soft login) never renders when Okta is configured (line: "Hidden entirely when Okta is configured").

**Assessment:** Matches the Recommended Fix (server-issued, signed session; resolve identity from a verified session, never from request input). The critical impersonation primitive from the original finding is closed in production.

**Residual note (not a regression, scoped to non-prod):** `AUTH_OKTA_ISSUER` is *not* set for the Preview environment (only `AUTH_OKTA_ID`/`AUTH_OKTA_SECRET` are). Preview deploys therefore fall back to the soft-login cookie, which is still forgeable by design (anyone can claim any `@housecallpro.com` email with no verification) — this is an accepted, intentional pre-SSO testing mode per the code's own comments, not a silent gap, but worth knowing if Preview URLs are ever treated as trustworthy.

---

### [F-02] Unauthenticated PII disclosure via `/api/user-lookup` — **REMEDIATED**

**Confidence:** High — the endpoint no longer exists.

**Verification Command Run:**
```bash
grep -rn "user-lookup" --include="*.js" --include="*.jsx" .
# (no output — no file, no reference, anywhere in the repo)
```

**Assessment:** Matches the Recommended Fix ("Remove the endpoint"). Fully gone, not just moved.

---

### [F-03] Slack signature verification is dead code — **REMEDIATED**

**Confidence:** High — the exact gap described (defined but never called) is closed; the code now matches the Recommended Fix almost verbatim.

**Current Code:**
```js
// app/api/slack/route.js:279-287
export async function POST(request) {
  const contentType = request.headers.get('content-type') || '';
  const rawBody = await request.text();

  const signature = request.headers.get('x-slack-signature');
  const timestamp = request.headers.get('x-slack-request-timestamp');
  if (!signature || !timestamp || !verifySlackSignature(signature, timestamp, rawBody)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  ...
```
```js
// app/api/slack/route.js:134-137 — response_url SSRF primitive closed
async function sendDelayedResponse(responseUrl, blocks, responseType) {
  try {
    const parsed = new URL(responseUrl);
    if (parsed.hostname !== 'hooks.slack.com') return;
    ...
```

**Assessment:** Both primitives from the original finding (bot impersonation via unverified `event_callback`, SSRF via `response_url`) are closed. `verifySlackSignature` itself (HMAC + `timingSafeEqual` + 5-minute window) is unchanged and now actually invoked.

---

### [F-04] `/api/manager-data` fails open when `MANAGER_DATA_SECRET` is unset — **REMEDIATED**

**Confidence:** High — code now matches the Recommended Fix verbatim, and the secret is confirmed set in production.

**Current Code:**
```js
// app/api/manager-data/route.js:24-32
export async function POST(request) {
  if (!API_SECRET) {
    return Response.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  const authHeader = request.headers.get('x-api-secret');
  if (!authHeader || authHeader.length !== API_SECRET.length ||
      !timingSafeEqual(Buffer.from(authHeader), Buffer.from(API_SECRET))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
```

**Verification:** `npx vercel env ls production` confirms `MANAGER_DATA_SECRET` is set in Production, so the fail-closed path does not itself break the current deployment.

**Assessment:** Fails closed (503) instead of open; comparison is now length-checked + timing-safe. Exact fix specified in the finding.

---

### [F-07] Admin gate is decorative; admin-impacting APIs are unauthenticated — **REMEDIATED**

**Confidence:** High — every admin-impacting route named in the finding (plus the ones added since) now has a server-side check, and `middleware.js` adds a session requirement on top.

**Current Code:**
```js
// lib/require-admin.js
export async function requireAdmin() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
```
- `app/api/curriculum/scan/route.js:8-9`, `app/api/curriculum/curate/route.js:14-15`, `app/api/curriculum/apply/route.js:14` all call `requireAdmin()` before doing any work.
- `app/api/curriculum/scan-now/route.js:116-119` and `app/api/curriculum/proposals/route.js` (both `GET` and `POST`) use the equivalent inline check (`getAuthenticatedUser()` + `isAdmin()`).
- `middleware.js` requires a valid Okta session on every route *except* an explicit allowlist (auth pages, static assets, `/api/slack`, `/api/manager-*`, and only `/api/curriculum/daily` — not the whole `/api/curriculum` prefix). The matcher comment explicitly says widening that exclusion "re-opens security review F-07/F-09."

**Verification Command Run:**
```bash
grep -n "requireAdmin\|isAdmin(" app/api/curriculum/{scan,curate,apply,scan-now,proposals}/route.js
# every file has a server-side admin check
```

**Assessment:** Matches the Recommended Fix's three asks: a shared server-side admin guard, called at the top of every admin-impacting route, plus route-matching middleware. The "UI gate is theatre" root cause is closed — a `curl` with no session now gets redirected to sign-in by middleware, and even with a valid non-admin session gets a 403 from `requireAdmin()`.

---

### [F-08] `/api/curriculum/daily` cron route fails open when `CRON_SECRET` is unset — **REMEDIATED**

**Confidence:** High — code matches the Recommended Fix verbatim, and `CRON_SECRET` is confirmed set in production.

**Current Code:**
```js
// lib/cron-auth.js
export function requireCronSecret(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  const provided = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
```
Used at the top of `app/api/curriculum/daily/route.js:123-124` (`const denied = requireCronSecret(request); if (denied) return denied;`).

**Verification:** `npx vercel env ls production` confirms `CRON_SECRET` is set in Production, and `docs/security/STATUS.md` separately records the same confirmation from `vercel env ls production` on 2026-08-11, plus notes two other crons (`/api/reporting/refresh`, `/api/model-lineup/refresh`) that had been silently failing due to the `middleware.js` matcher catching them — evidence the exclusion list was actually exercised, not just written.

**Assessment:** The literal `"Bearer undefined"` bypass is gone; comparison fails closed and is timing-safe. Exact fix specified in the finding.

---

### [F-05] User and shared data blobs stored with `access: 'public'` — **PARTIALLY REMEDIATED**

**Confidence:** High — verified with a live, anonymous fetch against the production blob store during this pass, not inferred from the fix description.

**What changed:** `lib/blob-json.js` now gates all new JSON writes behind `PRIVATE_READ_WRITE_TOKEN`: unset → public writes (old behavior), set → writes go to a second, genuinely-private Vercel Blob store (a public store's access mode can't be changed after creation, per Vercel — this is why a second store was needed). Media (screen recordings/screenshots) moved to the same private store, served only through an admin-gated proxy (`/api/feedback/media/[...path]`).

**Verification performed:**
```
npx vercel env ls production
# PRIVATE_READ_WRITE_TOKEN   Preview, Production   <- confirms the private-store gate is ON in prod
```
```js
// Listed the production PUBLIC blob store directly with @vercel/blob using
// the real BLOB_READ_WRITE_TOKEN pulled via `vercel env pull --environment production`
const { blobs } = await list({ token: env.BLOB_READ_WRITE_TOKEN });
// Total public-store blobs: 137
// feedback-recordings count: 0   <- media migration confirmed complete
// Non-audit, non-media blobs: 7 — leaderboard/cache.json + 6 users/skylar.hoover@housecallpro.com/*.json
```
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  "https://xhnmqsy93cya2unk.public.blob.vercel-storage.com/users/skylar.hoover%40housecallpro.com/profile.json"
# HTTP 200
curl -s "https://xhnmqsy93cya2unk.public.blob.vercel-storage.com/users/skylar.hoover%40housecallpro.com/profile.json"
# {"id":"","display_name":"","first_name":"","last_name":"","email":"skylar.hoover@housecallpro.com",
#  "department":"Enablement","top_tasks":[...],"tier":"developer","goals":[...], ...}
```

**Assessment:**
- Media (the largest and most sensitive residual exposure at the time of the 2026-08-11 status note — screen recordings that could show names/emails/other people's data): **confirmed fixed**. Zero `feedback-recordings/*` blobs remain in the public store; the old public URLs would 404.
- New/future JSON writes: **fixed at the code level** — `PRIVATE_READ_WRITE_TOKEN` is confirmed set in Production, so `saveUserData`, the manager-data blob, and the curriculum shared blobs all now write to the private store going forward.
- **Not fixed:** a live anonymous `curl` against a real, still-public blob URL returned this user's actual profile PII (email, department, tier, goals, top tasks) with **HTTP 200**, right now. Six `users/<email>/*.json` files plus `leaderboard/cache.json` plus 130 `audit/` entries were never migrated to the private store or deleted after the cutover — this matches what `docs/security/STATUS.md` itself flags as still open ("~52KB of JSON... Supabase owns the live path... deleting it may be the better answer — confirm nothing reads it first"), but it is a real, currently-exploitable instance of the original finding, not a closed one.

**Classification rationale:** This is a systemic finding with multiple blob classes named in the original Affected Components (`lib/blob-store.js`'s `saveUserData`, manager-data, and the curriculum shared blobs). Per the multi-instance rule, a fix applied to media/new-writes but not to the pre-existing user/audit/leaderboard JSON is Partially Remediated, not Remediated — `STATUS.md`'s "Fixed for media" framing is accurate but should not be read as "F-05 closed."

---

### [F-06] `learner_profile` cookie missing `HttpOnly` and `Secure`; carries PII — **REMEDIATED**

**Confidence:** High — no `document.cookie` writes remain anywhere in the codebase, and the replacement cookie is server-set, `HttpOnly`, and carries only an email string rather than the full profile object.

**Current Code:**
```js
// app/api/identity/route.js:30-36 (the pre-Okta fallback path)
const res = NextResponse.json({ ok: true, email: clean });
res.cookies.set(IDENTITY_COOKIE, clean, {
  path: '/',
  maxAge: ONE_YEAR,
  sameSite: 'lax',
  httpOnly: true,
});
```

**Verification Command Run:**
```bash
grep -rn "document.cookie" --include="*.js" --include="*.jsx" .
# (no output)
```

**Assessment:** In production, identity is resolved from NextAuth's own session cookie (JWT strategy), which the library issues `HttpOnly` and, over HTTPS with `AUTH_URL` set, `Secure` by default — closing the original finding's core scenario (arbitrary JS on the origin reading a PII-bearing cookie). The fallback `la_identity` cookie used only when Okta is unconfigured now carries just an email address, not the full profile object, and is `HttpOnly`.

**Verify-Agent Observation (not a confirmed finding):** the fallback `la_identity` cookie set in `app/api/identity/route.js:31-36` does not explicitly pass `secure: true`. This only matters in an environment where Okta isn't configured (currently Preview, since `AUTH_OKTA_ISSUER` is Production-only) — see the Observations section below.

---

### [F-09] Unauthenticated cost amplification on Anthropic + RSS via `/api/curriculum/{scan,curate}` — **REMEDIATED**

**Confidence:** High for the root cause (unauthenticated access); the fix guide's secondary recommendation (rate limiting) is confirmed still not implemented, but that does not block calling the core finding remediated.

**Current Code:** Both routes now start with `requireAdmin()` (see F-07 evidence above) — an anonymous `curl` gets `403` (or, before ever reaching the route, a `302` to `/auth/signin` from `middleware.js` if no session cookie is present at all).

**Verification Command Run:**
```bash
grep -n "requireAdmin" app/api/curriculum/scan/route.js app/api/curriculum/curate/route.js
# both files call requireAdmin() before any RSS fetch or Anthropic call
```

**Assessment:** The finding's primary ask ("Require admin auth on both routes") is done, and `middleware.js` now backs it with a session requirement too — the exploit scenario (`curl -X POST .../curriculum/curate` with no credentials) from the original report no longer works. The finding's secondary, defense-in-depth ask (`@upstash/ratelimit`-style rate limiting) is **not** implemented — confirmed by `grep -rn "ratelimit\|rate-limit" lib/ app/api/curriculum` returning nothing — but since the surface is no longer reachable by an anonymous caller, the residual risk is an authenticated-admin-abuses-the-endpoint scenario, materially smaller than the original unauthenticated-internet scenario the finding described.

---

### [F-10] Prompt injection via untrusted RSS feeds reaching content-safety filter and curator — **PARTIALLY REMEDIATED**

**Confidence:** High — both the fixed piece and the still-open piece are visible directly in the current code, not inferred.

**What's fixed — URL-scheme validation (closes the "clickable links" primitive):**
```js
// lib/parse-feed.js:86-93
export function isSafeUrl(u) {
  try {
    const { protocol } = new URL(u);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
```
Both `parseRssItems` (line 105) and `parseAtomEntries` (line 133) now gate on `isSafeUrl(link)` before accepting an item — a `javascript:` link in a feed's `<link>` tag is dropped, closing the primitive described in the finding's Impact #3.

**What's fixed — safety-filter quarantine (closes the "safety-filter manipulation" primitive):**
```js
// lib/content-safety.js:42-61
const titles = findings
  .map((f, i) => `${i + 1}. [${f.sourceName}] <untrusted>${String(f.title).replace(/[<>]/g, '')}</untrusted>`)
  .join('\n');
...
const removeIndices = new Set(
  parsed.filter(n => Number.isInteger(n) && n >= 1 && n <= findings.length)
);
```
This matches the Recommended Fix's delimiter + "treat as data" instruction + schema-validated output almost exactly.

**What's NOT fixed — the curator prompt (Impact #2, "curator manipulation," is still open):**
```js
// app/api/curriculum/curate/route.js:23-26 — no delimiter, no quarantine instruction
const findingsList = findings
  .slice(0, 30)
  .map((f, i) => `${i + 1}. [${f.sourceName}] ${f.title}\n   ${f.url}`)
  .join('\n');
```
```js
// app/api/curriculum/daily/route.js:240-243 — same pattern, same gap
const findingsList = merged
  .slice(0, 30)
  .map((f, i) => `${i + 1}. [${f.sourceName}] ${f.title}\n   ${f.url}`)
  .join('\n');
```
Neither the manual `curate` route nor the daily cron's inline curator wraps `f.title` in `<untrusted>` or instructs the model to treat it as data. A malicious RSS title still flows unquarantined into the curator's prompt.

**Verification Command Run:**
```bash
grep -n "untrusted" app/api/curriculum/curate/route.js app/api/curriculum/daily/route.js
# (no output in either file — no quarantine markers in the curator prompts)
```

**Assessment / why this still matters despite F-07's admin gate:** `app/api/curriculum/curate/route.js` is now admin-gated (F-07), so exploiting *that* endpoint directly requires an admin session. But `app/api/curriculum/daily/route.js`'s inline curator (lines 249-289) runs automatically on the daily cron with zero human interaction, fed directly by RSS content that the F-10 finding already established is attacker-reachable (HN, arXiv). A malicious title reaching that path still reaches an unquarantined Claude prompt whose output (a curriculum proposal with attacker-influenced `title`/`summary` text) lands in the admin's proposal queue. The two defenses that did land (URL-scheme filtering, safety-filter delimiting) close two of the three primitives in the original finding; the curator-manipulation primitive is unchanged.

---

### [F-11] `/api/slack` `GET` reveals env presence; minor info leak — **REMEDIATED**

**Confidence:** High — the specific field named in the finding is gone, and the code comment cites the finding by ID.

**Current Code:**
```js
// app/api/slack/route.js:377-387
export async function GET() {
  return Response.json({
    name: 'AI Learning Coach Slack Bot',
    status: 'active',
    commands: ['/pick', '/learn', '/leaderboard', '/heatmap', '/skills'],
    events: ['message.im', 'app_home_opened'],
    // Deliberately no `configured` flag here. Echoing whether the signing
    // secret and bot token are set told an anonymous prober exactly when the
    // signature check could be skipped (security review F-11).
  });
}
```

**Verification Command Run:**
```bash
grep -n "configured" app/api/slack/route.js
# (no output)
```

**Assessment:** The `configured: Boolean(SIGNING_SECRET && BOT_TOKEN)` field is gone entirely. Matches the Recommended Fix's first option (drop the field).

---

## Verify-Agent Observations — Not Confirmed Findings

> [VERIFY-AGENT OBSERVATION — NOT A CONFIRMED FINDING]
> While checking F-06/F-01, the pre-Okta fallback identity cookie (`app/api/identity/route.js:31-36`, `IDENTITY_COOKIE = 'la_identity'`) sets `httpOnly: true` and `sameSite: 'lax'` but does not explicitly set `secure: true`. This path is dead in Production (Okta is fully configured there, and `POST /api/identity` returns 400 when it is), but `AUTH_OKTA_ISSUER` is not set for the Preview environment, so Preview deploys still run this fallback with no explicit `Secure` attribute on the cookie. Not evaluated for exploitability (Vercel preview URLs are HTTPS-only, which limits the practical impact), and not written up as a full finding — flagging so it can get proper evidence/impact treatment from a full stack-scan pass if Preview is ever treated as a trust boundary.

> [VERIFY-AGENT OBSERVATION — NOT A CONFIRMED FINDING]
> `docs/security/STATUS.md` itself flags that JSON blob writes via `saveUserData` appear to have stopped around 2026-07-14/15 even though the code path is still live, and the leaderboard cache (60s TTL) hasn't refreshed since 2026-07-15 either — both consistent with what this pass's live blob listing found (last-write timestamps on `users/` and `leaderboard/cache.json` all in mid-July). This looks like a functional/data-freshness issue rather than a security one, and is called out in the tracker as "unexplained... worth a look on its own" — surfacing it here only because it was encountered while gathering F-05 evidence, not because it was independently investigated.

---

## Appendix — Cross-check against `docs/security/STATUS.md`

The repository has its own in-progress tracker (`docs/security/STATUS.md`, last verified 2026-08-11 by the team) claiming every finding fixed. This pass agrees on 9 of 11 and disagrees on 2:

| ID | `STATUS.md` claim | This verification |
|---|---|---|
| F-05 | "Closed for media... ~52KB of stale JSON is still public, see below" | **Partially Remediated** — `STATUS.md`'s own caveat is confirmed correct and still live: a direct anonymous fetch during this pass returned real PII from a still-public blob URL. |
| F-10 | "Fixed 2026-08-11" | **Partially Remediated** — the safety-filter and URL-scheme fixes are real and confirmed, but the curator prompts in `curate/route.js` and `daily/route.js` were not updated to match; `STATUS.md`'s summary line doesn't mention this gap. |

All other rows in `STATUS.md` match this verification's independent findings.
