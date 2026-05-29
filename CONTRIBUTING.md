# Contributing to the AI Learning Platform

Welcome! This guide walks you through everything you need to start contributing to the AI Learning Platform. No prior Git experience required.

---

## What You'll Need

- A **GitHub account** (free) — [Sign up here](https://github.com/signup) if you don't have one
- **Node.js** (version 18 or newer) — [Download here](https://nodejs.org/)
- A **code editor** — we recommend [VS Code](https://code.visualstudio.com/) (free)
- A **terminal** — VS Code has one built in (View > Terminal)

---

## Step 1: Accept the Invitation

Skylar will send you a GitHub collaborator invite. You'll get an email from GitHub — click the link to accept. This gives you permission to push changes to the project.

---

## Step 2: Clone the Repository

This downloads the project to your computer.

1. Open your terminal
2. Navigate to where you want the project to live:
   ```
   cd ~/Desktop
   ```
3. Clone the repo:
   ```
   git clone https://github.com/skylarhoover-26/Learning-Agent-Repository.git
   ```
4. Move into the project folder:
   ```
   cd Learning-Agent-Repository
   ```

---

## Step 3: Install Dependencies

Run this once (and again any time `package.json` changes):

```
npm install
```

This downloads all the libraries the project needs. It may take a minute.

---

## Step 4: Run the App Locally

```
npm run dev
```

Then open your browser to **http://localhost:3000**. You should see the AI Learning Platform dashboard.

Press `Ctrl + C` in the terminal to stop the server when you're done.

---

## Step 5: Make Changes

### Option A: Simple Edits (directly on `main`)

For small, quick fixes — typos, copy changes, minor tweaks:

1. Make sure you have the latest code:
   ```
   git pull
   ```
2. Edit the files you need to change in VS Code
3. Save your files
4. Stage and commit your changes:
   ```
   git add .
   git commit -m "Brief description of what you changed"
   ```
5. Push to GitHub:
   ```
   git push
   ```

That's it! Vercel will automatically deploy your changes to the live site within about 30 seconds.

### Option B: Branches + Pull Requests (recommended for bigger changes)

For new features, significant changes, or anything you want reviewed before it goes live:

1. Make sure you're on main and up to date:
   ```
   git checkout main
   git pull
   ```
2. Create a new branch for your work:
   ```
   git checkout -b your-name/what-youre-working-on
   ```
   Example: `git checkout -b bridget/update-lesson-page`

3. Make your changes, save your files
4. Stage and commit:
   ```
   git add .
   git commit -m "Brief description of what you changed"
   ```
5. Push your branch to GitHub:
   ```
   git push -u origin your-name/what-youre-working-on
   ```
6. Open a Pull Request:
   - Go to https://github.com/skylarhoover-26/Learning-Agent-Repository
   - You'll see a banner saying your branch was recently pushed — click **"Compare & pull request"**
   - Add a title and description of what you changed
   - Click **"Create pull request"**

7. Vercel will automatically create a **preview URL** for your PR so everyone can see your changes before they go live. The link will appear as a comment on the PR.

8. Once approved, click **"Merge pull request"** on GitHub. Vercel will auto-deploy to production.

---

## Project Structure

Here's where things live:

```
Learning-Agent-Repository/
├── app/                    ← Pages (each folder = a page on the site)
│   ├── page.jsx            ← Dashboard (the homepage)
│   ├── chat/page.jsx       ← Chat page
│   ├── discover/page.jsx   ← "Find AI for Your Work" page
│   ├── lesson/page.jsx     ← Quick Lesson page
│   ├── library/page.jsx    ← Use Case Library
│   ├── achievements/page.jsx
│   ├── quests/page.jsx
│   ├── goals/page.jsx
│   ├── projects/page.jsx
│   └── review/page.jsx     ← Spaced repetition review
├── components/             ← Reusable UI components
├── lib/                    ← Data and helper functions
│   ├── data.js             ← Data access layer
│   └── mock-data.js        ← Demo data (swap for real DB later)
├── package.json            ← Dependencies and scripts
└── tailwind.config.mjs     ← HCP brand colors and design tokens
```

---

## Common Tasks

### "I want to edit text on a page"
Open the corresponding file in `app/` — the page content is in JSX (HTML-like syntax). Look for the text between `>` and `<` tags and edit it directly.

### "I want to change colors or styling"
We use Tailwind CSS. Classes like `bg-brand`, `text-ink`, `rounded-2xl` control the look. See `tailwind.config.mjs` for our custom HCP brand colors.

### "I want to add a new page"
Create a new folder inside `app/` with a `page.jsx` file. For example, `app/my-new-page/page.jsx` becomes accessible at `/my-new-page`.

### "I want to change the demo data"
Edit `lib/mock-data.js`. This is the sample data that populates the dashboard, goals, projects, etc.

---

## Helpful Commands

| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start the app locally at localhost:3000 |
| `npm run build` | Test that the app builds without errors |
| `git pull` | Get the latest changes from GitHub |
| `git status` | See what files you've changed |
| `git log --oneline -5` | See the last 5 commits |

---

## Live Site

The production site auto-deploys from the `main` branch:

**https://learning-agent-pearl.vercel.app**

Every push to `main` triggers a new deploy. Every pull request gets its own preview URL.

---

## Getting Help

- **Stuck on Git?** — Ask Skylar, or try [GitHub's beginner guide](https://docs.github.com/en/get-started/quickstart)
- **Stuck on code?** — Open an issue on the repo describing what you're trying to do
- **Something broke?** — Don't panic! Git tracks everything. We can always roll back. Just let Skylar know.

---

## Tech Stack

- **Framework**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS with Housecall Pro brand tokens
- **Icons**: Lucide React
- **Hosting**: Vercel (auto-deploys from GitHub)
- **AI** (coming soon): Anthropic Claude API
