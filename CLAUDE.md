# Deployment

This is the **learning-agent** (AI Learning Platform) project. It is completely separate from the course-builder project.

- Production URL: `learning-agent-pearl.vercel.app`
- Vercel project: `learning-agent` (prj_2pHgd69tyRpUYmicI3yzoICkiTxl)
- GitHub repo: `Codefied/Learning-Agent-Repository` (remote `origin`) — **this is what Vercel deploys**
- Backup mirror: `skylarhoover-26/Learning-Agent-Repository` (remote `personal`) — deploys nothing

## How to deploy

Use `npm run deploy:prod` to deploy to production with verification.

## Pushing to prod requires a sign-off

**Pushing to `main` IS deploying to production** — Vercel's git integration builds
every push automatically, and there is no staging branch. So a push is a release,
and nobody releases on their own initiative.

**If you are Claude: never push or deploy without the human explicitly asking in
that turn.** Not "it seems ready", not "the checklist passed" — an actual request.
Run the checklist below, show the summary, and stop. Committing locally is always
fine; pushing is not.

Contributors: the same rule in human terms — commit and share what you've got,
then ask before it goes to prod.

This is why `.claude/settings.json` puts `git push`, `npm run deploy*`, and the
`vercel` deploy/alias/promote/rollback commands in the `ask` list. That project
rule overrides a broader personal allowlist, so the prompt still appears even if
your own global settings would have allowed it.

## Pre-push checklist (MANDATORY before any git push)

When the user says "push to GitHub", "push it up", "push to git hub", or anything similar, run through ALL of these steps before pushing:

0. **Lint and build** — Run `npm run lint` (must report 0 errors; warnings are informational) and `npx next build` (must compile). There is no test suite in this repo, so these two are the only automated gates
1. **Confirm the project** — Say which project you're about to push (learning-agent) and ask the user to confirm
2. **Verify the directory** — Run `pwd` and confirm you're in `/Users/skylarhoover/projects/learning-agent/`
3. **Verify the remote** — Run `git remote -v` and confirm `origin` points to `Codefied/Learning-Agent-Repository`
4. **Check what's being pushed** — Run `git status` and `git log origin/main..HEAD --oneline` to show exactly which commits will be pushed
5. **Verify no cross-project files** — Confirm none of the changed files reference or belong to the course-builder project
6. **Check env vars** — If any changed files read `process.env`, run `vercel env ls production` and confirm the vars exist
7. **Show the summary** — Present a short summary: project name, remote, number of commits, and key files changed
8. **Wait for user confirmation** — Do NOT push until the user explicitly says go ahead

## Push order: Codefied first, personal second

There are two remotes and the order matters.

```bash
git push origin main      # 1. Codefied — THIS DEPLOYS PRODUCTION
git push personal main    # 2. backup mirror — deploys nothing
```

`origin` (Codefied) is wired to Vercel's git integration on branch `main`, so
step 1 *is* the release. Step 2 only keeps the old repo aligned as a backup;
it has no deploy attached and can never ship anything on its own.

Push in that order, not the reverse. Pushing the mirror first means that if
something goes wrong at step 1 you have already advanced a second repo to a
sha that was never released, and the two disagree about what "latest" means.

**Do not run `npm run deploy:prod` after a `git push origin main`.** The push
already triggered the real build. Running the script on top of it adds a
second, CLI-sourced deployment built from your **local working tree**, which
overrides the git build and can ship uncommitted files. Vercel stamps CLI
deploys with the linked repo's branch metadata, so the dashboard will claim it
came from `Codefied/main` when it did not — this has already caused one false
"the repos are in sync" reading. Check `source` and `gitDirty` on a deployment
before trusting its sha.

`npm run deploy:prod` is now only for deploying **without** a push (a hotfix
you deliberately do not want committed yet). It still lints and auto-rolls-back,
so prefer it over raw `vercel --prod` when you do need it.

## Linting

ESLint 9 flat config in `eslint.config.mjs`, extending `next/core-web-vitals`.

- `npm run lint` — the gate. Errors fail; warnings are informational.
- `npm run lint:fix` — auto-fixable issues only.
- `npm run lint:strict` — `--max-warnings 0`, for driving the remaining warnings down.

`next lint` is gone (deprecated in Next 15, removed in 16) — it never worked here anyway, since there was no config and it dropped into an interactive setup prompt.

Lint also runs inside `next build`, so a lint **error** fails the Vercel production build. Warnings don't.

Two things that will bite you if you edit the config:
- ESLint 9 lints only `.js/.mjs/.cjs` by default. The `files: ['**/*.{js,mjs,cjs,jsx}']` entry is what makes it see `.jsx` — remove it and lint silently passes over nearly the whole UI.
- `prototypes/` and `assets-archive/` are intentionally ignored (retired code, not in the build).

## Never do

- Never run `vercel alias set` to point `course-builder-gray-one.vercel.app` at a deployment from this repo
- Never deploy from this directory while linked to the course-builder project
- This project has no relationship to the course-builder — no shared code, no shared aliases, no shared env vars
