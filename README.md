# Learning Agent

Live app: [learning-agent-pearl.vercel.app](https://learning-agent-pearl.vercel.app)

## How It All Works

- **Git** connects your terminal to GitHub. It's how you clone, push, and pull code. (Pre-installed on Mac. Windows users install it from [git-scm.com](https://git-scm.com).)
- **Node.js** is the engine that runs the app's code. It comes with **npm**, which downloads all the libraries the app depends on (React, Next.js, etc.). Install it from [nodejs.org](https://nodejs.org).
- **Vercel** is connected directly to the GitHub repo. You don't need to do anything with Vercel — it automatically builds and deploys the app whenever code is pushed to `main`.

## One-Time Setup

1. Install [Git](https://git-scm.com) (Windows only — Mac has it built in) and [Node.js](https://nodejs.org)
2. Open your terminal and clone the repo:
   ```
   git clone https://github.com/skylarhoover-26/Learning-Agent-Repository.git
   ```
3. Navigate into the project folder:
   ```
   cd Learning-Agent-Repository
   ```
4. Install dependencies:
   ```
   npm install
   ```

## Making Changes and Pushing to Production

1. Pull the latest code before making changes:
   ```
   git pull origin main
   ```
2. Make your code changes in your editor
3. Stage your changes:
   ```
   git add .
   ```
4. Commit with a short description of what you changed:
   ```
   git commit -m "Brief description of your change"
   ```
5. Push to production:
   ```
   git push origin main
   ```
6. Wait 1-2 minutes for Vercel to build and deploy. Your changes will be live at [learning-agent-pearl.vercel.app](https://learning-agent-pearl.vercel.app)
