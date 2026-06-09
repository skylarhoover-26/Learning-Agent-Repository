# Deployment

This is the **learning-agent** (AI Learning Platform) project. It is completely separate from the course-builder project.

- Production URL: `learning-agent-pearl.vercel.app`
- Vercel project: `learning-agent` (prj_2pHgd69tyRpUYmicI3yzoICkiTxl)
- GitHub repo: `skylarhoover-26/Learning-Agent-Repository`

## How to deploy

Use `npm run deploy:prod` to deploy to production with verification.

## Pre-push checklist (MANDATORY before any git push)

When the user says "push to GitHub", "push it up", "push to git hub", or anything similar, run through ALL of these steps before pushing:

1. **Confirm the project** — Say which project you're about to push (learning-agent) and ask the user to confirm
2. **Verify the directory** — Run `pwd` and confirm you're in `/Users/skylarhoover/projects/learning-agent/`
3. **Verify the remote** — Run `git remote -v` and confirm it points to `skylarhoover-26/Learning-Agent-Repository`
4. **Check what's being pushed** — Run `git status` and `git log origin/main..HEAD --oneline` to show exactly which commits will be pushed
5. **Verify no cross-project files** — Confirm none of the changed files reference or belong to the course-builder project
6. **Check env vars** — If any changed files read `process.env`, run `vercel env ls production` and confirm the vars exist
7. **Show the summary** — Present a short summary: project name, remote, number of commits, and key files changed
8. **Wait for user confirmation** — Do NOT push until the user explicitly says go ahead

After push, deploy with `npm run deploy:prod` (never raw `vercel --prod`).

## Never do

- Never run `vercel alias set` to point `course-builder-gray-one.vercel.app` at a deployment from this repo
- Never deploy from this directory while linked to the course-builder project
- This project has no relationship to the course-builder — no shared code, no shared aliases, no shared env vars
