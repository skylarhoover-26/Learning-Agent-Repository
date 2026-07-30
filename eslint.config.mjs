import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

// ESLint 9 flat config. `next lint` is deprecated (and was never actually usable
// in this repo — it had no config and dropped into an interactive setup prompt),
// so linting runs through the ESLint CLI: `npm run lint`.
//
// eslint-config-next still ships an eslintrc-style config, so it's bridged in
// with FlatCompat — this is the same shape create-next-app generates.

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    // ESLint 9 lints only .js/.mjs/.cjs by default — WITHOUT this, `eslint .`
    // silently skips every .jsx file, which is nearly all the UI in this repo
    // (it reported 5 problems across the whole codebase before this was added).
    files: ['**/*.{js,mjs,cjs,jsx}'],
  },

  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      // Retired standalone prototypes kept for reference only. They aren't in
      // the Tailwind content globs or the build, and they don't follow current
      // conventions — linting them would bury real findings in noise.
      'prototypes/**',
      'assets-archive/**',
    ],
  },

  // next/core-web-vitals = the Next.js rules plus the stricter Core Web Vitals
  // set (unoptimized <img>, sync scripts, etc.), on top of the React and
  // react-hooks recommended rules.
  ...compat.extends('next/core-web-vitals'),

  {
    rules: {
      // Deliberate call, not laziness: this codebase renders a lot of learner
      // copy with apostrophes and the escaped form (&apos;) is materially harder
      // to read and edit in JSX. The rule catches nothing that breaks.
      'react/no-unescaped-entities': 'off',

      // The avatar SVGs and the artwork in games are drawn inline, and next/image
      // can't render an <img> inside an <svg>. Where a real <img> should become
      // next/image, that's a case-by-case migration, not a blanket gate.
      '@next/next/no-img-element': 'warn',

      // Not in next/core-web-vitals, but a genuine bug catcher — and app/page.jsx
      // has a deliberate `eslint-disable-next-line no-unreachable` guarding a
      // legacy block kept for reference, which only means something if the rule
      // is actually on.
      'no-unreachable': 'error',

      // Unused code is worth seeing but must not fail the gate — a half-finished
      // import while iterating is normal and blocking on it trains people to
      // ignore the linter.
      'no-unused-vars': ['warn', {
        args: 'none',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
      }],
    },
  },

  {
    // Config files legitimately export a bare object/array — that's the format
    // the tools require, so the "name it first" style rule doesn't apply.
    files: ['*.config.mjs', 'eslint.config.mjs'],
    rules: {
      'import/no-anonymous-default-export': 'off',
    },
  },
];

export default config;
