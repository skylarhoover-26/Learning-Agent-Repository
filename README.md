# Learning Agent

Live app: [learning-agent-pearl.vercel.app](https://learning-agent-pearl.vercel.app)

## How It All Works

- **Git** connects your terminal to GitHub. It's how you clone, push, and pull code. (Pre-installed on Mac. Windows users install it from [git-scm.com](https://git-scm.com).)
- **Node.js** is the engine that runs the app's code. It comes with **npm**, which downloads all the libraries the app depends on (React, Next.js, etc.). Install it from [nodejs.org](https://nodejs.org).
- **Vercel** is connected directly to the GitHub repo. You don't need to do anything with Vercel — it automatically builds and deploys the app whenever code is pushed to `main`.

## One-Time Setup

You only need to do these steps once on your computer.

1. Install [Git](https://git-scm.com) (Windows only — Mac has it built in) and [Node.js](https://nodejs.org). These are normal app installers you download in your browser and click through.

2. Open your terminal and clone the repo. This downloads a copy of the project to your computer:
   ```
   git clone https://github.com/skylarhoover-26/Learning-Agent-Repository.git
   ```

3. Navigate into the project folder. This tells your terminal to work inside the project:
   ```
   cd Learning-Agent-Repository
   ```

4. Install dependencies. This downloads all the libraries the app needs to run (React, Next.js, etc.):
   ```
   npm install
   ```

## Making Changes and Pushing to Production

Every time you want to make a change, follow these steps. All commands are run in your terminal.

### Starting a New Session

1. Open your terminal (Terminal on Mac, Git Bash on Windows).

2. Navigate to the project folder. The terminal doesn't remember where you were last time, so you need to do this each time:
   ```
   cd Learning-Agent-Repository
   ```

### Making and Pushing Your Changes

1. Pull the latest code before making changes. This makes sure you have everyone else's recent updates:
   ```
   git pull origin main
   ```

2. Make your code changes in your editor (e.g. VS Code).

3. Stage your changes. This tells Git which files you want to include in your update:
   ```
   git add .
   ```

4. Commit with a short description of what you changed. This saves a snapshot of your changes with a message:
   ```
   git commit -m "Brief description of your change"
   ```

5. Push to production. This sends your changes to GitHub, which triggers Vercel to rebuild and deploy the app:
   ```
   git push origin main
   ```

6. Wait 1-2 minutes for Vercel to finish. Your changes will be live at [learning-agent-pearl.vercel.app](https://learning-agent-pearl.vercel.app)
