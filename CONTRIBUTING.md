# Contributing to the AI Learning Platform

Welcome! This guide walks you through everything you need to start contributing to the AI Learning Platform. No prior Git or coding experience required.

There are two ways to contribute — pick whichever fits you best:

| Path | Best for | What you need |
|------|----------|---------------|
| **Path A: Browser Only** | Editing text, content, copy, data | Just a GitHub account |
| **Path B: Full Local Setup** | Building features, previewing changes, writing code | GitHub + Node.js + VS Code |

Both paths are explained below. Start with **Step 1** (everyone needs this), then jump to your path.

---

## Step 1: Accept the Invitation (everyone)

Skylar will send you a GitHub collaborator invite. You'll get an email from GitHub — click the link to accept. This gives you permission to make changes to the project.

If you don't have a GitHub account yet, [sign up here](https://github.com/signup) (free).

---

# Path A: Browser Only (No Install Required)

This path is perfect if you want to edit content, fix text, update data, or make small changes — all from your browser. You don't need to install anything.

### How it works

Every time you save a change on GitHub, Vercel automatically builds and deploys the updated site. You'll see your changes live within about 30 seconds.

### Step A1: Go to the repo

Open https://github.com/skylarhoover-26/Learning-Agent-Repository

### Step A2: Find the file you want to edit

Click through the folders to find the file. See the [Project Structure](#project-structure) section below to know where things live.

### Step A3: Edit the file

1. Click on the file name to open it
2. Click the **pencil icon** (top right of the file) to enter edit mode
3. Make your changes directly in the browser
4. When done, click **"Commit changes"** (green button)
5. Add a short description of what you changed (e.g., "Updated quiz question text")
6. Choose **"Commit directly to the main branch"** for small changes, or **"Create a new branch"** if you want someone to review first
7. Click **"Commit changes"**

That's it! If you committed to `main`, Vercel will deploy your changes to the live site automatically.

### What you can edit this way

- **Page text and content** — files in the `app/` folder
- **Demo data** — `lib/mock-data.js` (learner profiles, lessons, goals, badges, etc.)
- **Use case library entries** — inside `app/library/page.jsx`
- **Quest descriptions** — inside `app/quests/page.jsx`
- **Chat suggestions** — inside `app/chat/page.jsx`

---

# Path B: Full Local Setup

This path is for building features, writing new code, or previewing changes on your own computer before pushing. You'll need a few tools installed.

### What you'll need

- **Node.js** (version 18 or newer) — [Download here](https://nodejs.org/). Node.js is the engine that runs JavaScript on your computer. The app is written in JavaScript, and while browsers can run JavaScript when someone visits the site, you need Node.js to build the site and run it locally during development. Think of it like needing Microsoft Word installed to edit a Word doc — the file exists either way, but you need the program to work with it on your machine.
- **A code editor** — we recommend [VS Code](https://code.visualstudio.com/) (free). This is like a supercharged text editor designed for code. It color-codes things, catches typos, and has a built-in terminal.
- **A terminal** — this is the command-line window where you type commands. VS Code has one built in (View > Terminal), or you can use the Terminal app on Mac.

### Step B1: Clone the repository

"Cloning" downloads the entire project to your computer.

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

### Step B2: Install dependencies

The project uses several open-source libraries (like React for the UI and Tailwind for styling). This command downloads all of them:

```
npm install
```

Run this once after cloning, and again any time someone updates `package.json` (the file that lists what libraries the project needs).

### Step B3: Run the app locally

```
npm run dev
```

Open your browser to **http://localhost:3000**. You should see the AI Learning Platform dashboard, running on your own computer. Any changes you make to the files will show up in the browser immediately (just save the file and refresh).

Press `Ctrl + C` in the terminal to stop the server when you're done.

### Step B4: Make changes and push

**For small, quick changes (directly on `main`):**

1. Make sure you have the latest code:
   ```
   git pull
   ```
2. Edit files in VS Code and save
3. Stage and commit your changes:
   ```
   git add .
   git commit -m "Brief description of what you changed"
   ```
4. Push to GitHub:
   ```
   git push
   ```

Vercel will automatically deploy your changes to the live site within about 30 seconds.

**For bigger changes (using a branch + pull request):**

Branches let you work on something without affecting the live site until you're ready. A pull request (PR) is how you propose merging your branch into the main project — it lets others review your changes and gives you a preview URL to test with.

1. Make sure you're up to date:
   ```
   git checkout main
   git pull
   ```
2. Create a new branch:
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
6. Go to https://github.com/skylarhoover-26/Learning-Agent-Repository — you'll see a banner saying your branch was recently pushed. Click **"Compare & pull request"**.
7. Add a title and description, then click **"Create pull request"**.
8. Vercel will automatically create a **preview URL** so everyone can see your changes before they go live. The link appears as a comment on the PR.
9. Once approved, click **"Merge pull request"**. Vercel auto-deploys to production.

---

# Understanding the Files

## Project Structure

```
Learning-Agent-Repository/
├── app/                       ← All the pages of the site
│   ├── globals.css            ← Global styles (fonts, colors)
│   ├── layout.jsx             ← The shell that wraps every page (title, body tag)
│   ├── page.jsx               ← The dashboard / homepage
│   ├── achievements/page.jsx  ← Badges and level progress
│   ├── chat/page.jsx          ← AI chat interface
│   ├── discover/page.jsx      ← "Find AI for Your Work"
│   ├── goals/page.jsx         ← Learning goals tracker
│   ├── lesson/page.jsx        ← Quick Lesson topic picker + lesson view
│   ├── library/page.jsx       ← Use Case Library (8 use cases with prompts)
│   ├── projects/page.jsx      ← Work projects you're applying AI to
│   ├── quests/page.jsx        ← Guided project quests (20-60 min)
│   └── review/page.jsx        ← Spaced repetition quiz cards
│
├── components/                ← Reusable building blocks
│   └── page-header.jsx        ← The dark blue header bar used on every subpage
│
├── lib/                       ← Data and logic (not visible on screen directly)
│   ├── data.js                ← Functions that look up learner data, goals, XP, etc.
│   └── mock-data.js           ← The demo data — this is what populates the whole app
│
├── package.json               ← Lists the project's dependencies and scripts
├── tailwind.config.mjs        ← Housecall Pro brand colors and design tokens
├── next.config.mjs            ← Next.js configuration (mostly defaults for now)
├── postcss.config.mjs         ← CSS processing config (required by Tailwind)
├── jsconfig.json              ← Lets us use @/ shortcuts in imports
└── .gitignore                 ← Tells Git which files to NOT track (node_modules, etc.)
```

## What are these file types?

| Extension | What it is |
|-----------|-----------|
| `.jsx` | JavaScript + HTML combined. This is what every page and component is written in. The HTML-looking parts are the visible content; the JavaScript parts handle logic like "show this if the user has a streak." |
| `.js` | Plain JavaScript. Used for data and helper functions that don't render anything visual. |
| `.css` | Stylesheet. Controls fonts, colors, and base styles. We mostly use Tailwind classes instead of writing CSS directly. |
| `.mjs` | JavaScript module. Same as `.js` but explicitly marked as a module. Used for config files. |
| `.json` | Data file. Stores structured information like project settings and dependencies. |

## How a page works

Every page file (`page.jsx`) follows the same pattern:

1. **Imports** at the top — pull in tools, icons, and data
2. **The component function** — this is the page itself. It returns HTML-like content (JSX) that becomes what you see in the browser.
3. **Helper functions** at the bottom — small building blocks the page uses

For example, in the dashboard (`app/page.jsx`):
- The `Dashboard` function is the main page
- `SkillColumn` and `QuickAction` are smaller pieces that the dashboard uses
- The text you see on screen is between `>` and `<` in the JSX

**If you just want to change what text shows up on a page**, look for the text inside the JSX tags and edit it. You don't need to understand the JavaScript around it.

## Key files for content editors

These are the files you'll most likely want to edit:

| What you want to change | File to edit |
|--------------------------|-------------|
| Demo learner name, role, tier | `lib/mock-data.js` — edit `DEMO_LEARNER` |
| Lesson history / completed lessons | `lib/mock-data.js` — edit `DEMO_LESSON_HISTORY` |
| Goals shown on dashboard | `lib/mock-data.js` — edit `DEMO_GOALS` |
| Badge definitions and names | `lib/data.js` — edit the `BADGES` object |
| Use case library entries | `app/library/page.jsx` — edit the `USE_CASES` array |
| Quest descriptions | `app/quests/page.jsx` — edit the `QUESTS` array |
| Chat suggestion prompts | `app/chat/page.jsx` — edit the `SUGGESTIONS` array |
| Discover sample prompts | `app/discover/page.jsx` — edit `SAMPLE_PROMPTS` and `DEMO_OPPORTUNITIES` |
| Lesson topic suggestions | `app/lesson/page.jsx` — edit the `SUGGESTED_TOPICS` array |
| AI news items on dashboard | `lib/mock-data.js` — edit `DEMO_KNOWLEDGE` |
| HCP brand colors | `tailwind.config.mjs` — edit the `colors` section |

---

## Helpful Commands (Path B only)

| Command | What it does |
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

- **Stuck on Git?** Ask Skylar, or check [GitHub's beginner guide](https://docs.github.com/en/get-started/quickstart)
- **Stuck on code?** Open an issue on the repo describing what you're trying to do
- **Something broke?** Don't panic! Git tracks every change ever made. We can always roll back. Just let Skylar know.
- **Not sure which file to edit?** Check the "Key files for content editors" table above, or ask Skylar.

---

## Tech Stack (for the curious)

- **Next.js 15** — the framework that builds the site. It turns our `.jsx` files into web pages.
- **React 19** — the library that makes the UI interactive (buttons, forms, etc.)
- **Tailwind CSS** — a styling system where you add classes like `bg-blue-500` instead of writing separate CSS files. All our Housecall Pro brand colors are configured in `tailwind.config.mjs`.
- **Lucide React** — the icon library. Those little icons throughout the UI come from here.
- **Vercel** — the hosting platform. It watches GitHub and auto-deploys whenever code changes.
- **Anthropic Claude API** (coming soon) — the AI that will power lessons, chat, and discovery.
