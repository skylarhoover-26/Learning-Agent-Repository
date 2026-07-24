# Icon / branding archive — pre-AILC01 (2026-07-24)

Snapshot of the app's icon assets **before** switching to the new AI Learning Coach
emblem (`AILC01.png`, the blue/yellow book-person-in-orbit mark).

## What's here
- `favicon.ico` — the previous multi-res favicon (16/32/48).
- `icon.png` — the previous 512×512 App Router icon.

The previous in-app "logo" was NOT an image — it was a CSS gradient box + the Lucide
`Sparkles` icon, rendered in three spots:
- `components/cinematic/cinematic-shell.jsx` — top bar + drawer header
- `app/auth/signin/page.jsx` — sign-in hero

## How to revert
1. Restore the two icon files:
   ```
   cp assets-archive/pre-AILC01-2026-07-24/favicon.ico app/favicon.ico
   cp assets-archive/pre-AILC01-2026-07-24/icon.png app/icon.png
   ```
2. Revert the three logo marks (gradient + `<Sparkles>`) in the two files above —
   easiest via `git revert` of the AILC01 commit, or restore those files from git
   history prior to the commit.
3. Optionally delete `public/brand/ai-learning-coach.png`.

The cleanest full revert is `git revert <AILC01 commit sha>`.
