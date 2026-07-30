# Gotchas

Things in this app that have already cost someone hours. Each one is a real
incident, not a style preference. If you're about to touch one of these areas,
read the entry first.

**Read this before you add an API route, touch the middleware, or deploy.**

---

## API routes

### LLM routes need an explicit `maxDuration`

Any route that calls Claude must export one, or it dies at the platform default
timeout — often *before* it can log anything, so you get a silent failure with
no error to chase.

```js
export const maxDuration = 300;  // seconds
```

36 routes already do this. Copy the value from a comparable route:
`app/api/lesson/plan/route.js` for heavy generation, something smaller for a
quick Haiku call.

**Related trap:** the *client's* abort timeout must sit UNDER the route's
`maxDuration`. When it didn't, we aborted requests the server was still
successfully working on — a slow-but-fine Project Quest became a hard failure,
and the learner sat through 8m25s before seeing an error. See the long comment
in `components/plan-lesson-player.jsx` around the plan fetch.

### GET routes over mutable data need `force-dynamic`

Next will happily cache a GET at build time. If the route reads anything that
changes at runtime — blob config, admin toggles, per-user state — it must say so:

```js
export const dynamic = 'force-dynamic';
```

Symptom when you forget: you change a setting in an admin screen, the API keeps
returning the old value, and nothing looks broken. 22 routes already set this.

---

## Middleware / SSO

`middleware.js` has a single matcher with a **negative lookahead exclusion
list** — everything *not* excluded gets the Okta redirect. That includes things
that aren't people:

- **Static assets.** Icons, the manifest, and `brand/` all had to be added
  explicitly. Without that, the browser asks for an icon and gets a `302` to the
  Okta sign-in page.
- **Machine callers.** `api/cron`, `api/slack`, the n8n webhook routes. A cron
  job can't complete an SSO flow — it just gets a redirect and silently does
  nothing.

**If you add a route that a machine calls, or a new folder under `public/`, add
it to the matcher and then verify with curl** — you want `200`, not `302`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://learning-agent-pearl.vercel.app/brand/your-file.png
```

A `MIDDLEWARE_INVOCATION_FAILED` error means the Edge middleware failed to boot
at all, which takes down *every* route. Redeploy or roll back — don't debug it
live.

---

## Storage

### Two systems, and the order matters

User data is **dual-written**: `app/api/user-data/route.js` POST saves to the
Blob store *and* mirrors to Supabase. GET reads **Supabase first**, falling back
to the blob when Supabase has no record. If you add a new data type, go through
this route rather than writing to one store directly — otherwise the two drift
and which value a user sees depends on which store answered.

### A wrong Blob token reads as *empty*, not as an error

`BLOB_READ_WRITE_TOKEN` must belong to the store in `BLOB_STORE_ID`. A token for
a different store returns an empty result set, not a failure — so "all the data
is gone" and "the token points at the wrong store" look identical from the app.
Check the store id before concluding you've lost data.

### XP and progress are local-first

`lib/learner-store.js` keeps XP/badges/lessons in `localStorage` and mirrors to
the server. Two consequences:

- **Never clear `lp_*` / `learner_*` keys on logout.** They're namespaced per
  learner id, so a different tester is already isolated. Wiping them destroyed
  the local XP log, which made the "first login" bonus re-fire and desynced the
  learner from the leaderboard.
- **Hydrate before awarding.** `components/progression-provider.jsx` restores
  from the server *before* granting the welcome bonus. Reversing that order reads
  an empty local store, re-grants the bonus, and syncs that 25-XP-only history
  back over the learner's real progress. This has caused real data loss.

---

## Deploying

- **Pushing to `main` deploys to production.** Vercel's git integration builds
  every push to `main` automatically. There is no staging branch. See the push
  policy in `CLAUDE.md` — get a sign-off first.
- **Use `npm run deploy:prod`,** never a raw `vercel --prod`. The script verifies
  the linked project, lints, captures a rollback target, and health-checks the
  alias afterward.
- **Lint errors fail the build.** ESLint runs during `next build`, so a lint
  *error* (warnings are fine) blocks the deploy — for everyone, not just you.
- **Verify on the alias, not the deployment URL.** A raw deployment URL shows
  Vercel's deployment protection, which masks the app's real health. A `302` on
  `learning-agent-pearl.vercel.app` is the *normal* signed-out response.
- **`vercel rollback` pins the alias** to that deployment, so later git deploys
  stop moving it. To move forward again, use `vercel promote`.
- **Sensitive env vars can't be pulled.** `vercel env pull` returns them blank.
  Verify them at runtime instead of trusting a local `.env` copy.
- **Never point another project's alias at this repo.** Specifically, never run
  `vercel alias set` for `course-builder-gray-one.vercel.app` from here. The two
  projects share nothing.

---

## Testing

There is **no test suite**. `npm run lint` and `npx next build` are the only
automated gates, and neither catches a render loop or a broken effect —
`next build` compiles a component without ever mounting it. If you change React
state or effects, load the real page and watch it before you ship.
