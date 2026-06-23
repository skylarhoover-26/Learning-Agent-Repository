# HANDOFF — Okta SSO (Learning Agent / AI Learning Coach)

**Status:** Code complete + hardened. **Blocked on IT** for the production Okta app
Client ID + Client Secret. Once those arrive, do the steps in "When credentials arrive" below.

App type: **confidential server-side Web App** (Next.js 15 + Auth.js v5). OIDC, Authorization
Code + PKCE (S256). No implicit flow. **No DPoP.** All token exchange + storage is server-side;
the browser only ever holds an encrypted httpOnly JWT session cookie.

---

## What's already done (in code)

- `auth.js` — Auth.js v5 Okta provider, server-side code exchange.
  - `checks: ['pkce', 'state']` set explicitly (defense-in-depth; also the provider default).
  - `scope: 'openid profile email'`.
  - Org-issuer guard: errors if `AUTH_OKTA_ISSUER` contains `/oauth2/<id>` (rejects custom /
    "default" auth servers — standard requires the org server only).
  - `signIn` callback restricts login to `@housecallpro.com` emails.
  - `jwt`/`session` callbacks persist **only** `email` + `name` — no access/refresh/id token is
    ever put in the cookie or exposed to the browser.
- `middleware.js` — gates all routes (with API/webhook exceptions) behind auth when Okta is
  configured; no-ops when it isn't (so the app currently runs open).
- `app/api/auth/[...nextauth]/route.js` — Auth.js route handler.
- `app/auth/signin/page.jsx` — custom sign-in page with "Sign in with Okta" button; gated by
  the `NEXT_PUBLIC_OKTA_CONFIGURED` flag.

SSO is currently **dormant**: production has only `AUTH_SECRET` set, so `oktaConfigured` is
false → no provider → middleware no-ops → app is open. It flips on automatically once the
`AUTH_OKTA_*` vars + `NEXT_PUBLIC_OKTA_CONFIGURED=true` are present.

---

## IT request — submitted values (for reference)

- **Environment:** Prod (production and non-prod are separate Okta apps)
- **Application type:** Web App (confidential client)
- **Standard:** OIDC (required), Authorization Code + PKCE. No DPoP.
- **Issuer needed:** `https://housecallpro.okta.com` (ORG auth server — NOT a custom/"default"
  server, no `/oauth2/...` path)
- **Scopes:** `openid`, `profile`, `email`
- **Redirect URI:** `https://learning-agent-pearl.vercel.app/api/auth/callback/okta`
- **Sign-out redirect URI:** `https://learning-agent-pearl.vercel.app`
- **Initiate login URI:** `https://learning-agent-pearl.vercel.app/auth/signin`

Note: the redirect path `/api/auth/callback/okta` is fixed by the Auth.js library and must be
registered verbatim. App display name ("AI Learning Coach") is just an Okta label — safe to
rename later with zero impact on the integration.

---

## When credentials arrive — paste this to Claude Code

> Okta SSO for the learning agent is unblocked. IT gave me:
> Client ID = `<PASTE>`
> Client Secret = `<PASTE>`
> Issuer = https://housecallpro.okta.com
> Set up the Vercel production env vars per HANDOFF-OKTA-SSO.md and walk me through verifying it.

Then Claude will set the following in **Vercel → learning-agent → Production**:

| Var | Value | Notes |
|---|---|---|
| `AUTH_OKTA_ISSUER` | `https://housecallpro.okta.com` | Org server, no `/oauth2/` path |
| `AUTH_OKTA_ID` | (Client ID from IT) | |
| `AUTH_OKTA_SECRET` | (Client Secret from IT) | **Mark Sensitive** |
| `AUTH_URL` | `https://learning-agent-pearl.vercel.app` | **Critical** — pins `redirect_uri` to the stable alias so Vercel per-deploy preview URLs don't break the Okta match |
| `NEXT_PUBLIC_OKTA_CONFIGURED` | `true` | Turns the sign-in page on (boolean flag, not a secret) |
| `AUTH_SECRET` | (already set) | leave as-is |

CLI (do NOT paste the secret into shell history in plaintext if avoidable — prefer the Vercel
dashboard for `AUTH_OKTA_SECRET`, marked Sensitive):

```
vercel env add AUTH_OKTA_ISSUER production
vercel env add AUTH_OKTA_ID production
vercel env add AUTH_OKTA_SECRET production        # mark Sensitive in dashboard
vercel env add AUTH_URL production
vercel env add NEXT_PUBLIC_OKTA_CONFIGURED production
```

Then redeploy: `npm run deploy:prod` (never raw `vercel --prod`).

---

## Verification checklist (after deploy)

1. `vercel env ls production` shows all five `AUTH_*` / `NEXT_PUBLIC_OKTA_CONFIGURED` vars.
2. Visit `https://learning-agent-pearl.vercel.app` in a fresh/incognito window → should redirect
   to `/auth/signin`.
3. Click "Sign in with Okta" → lands on `housecallpro.okta.com` → after login, returns to the app.
4. Confirm the URL has `code`/`state` stripped after the exchange (Auth.js handles this).
5. Non-`@housecallpro.com` account → "Access denied" (signIn callback).
6. DevTools → Application → Cookies: session cookie is `HttpOnly` + `Secure`. No tokens in
   localStorage/sessionStorage.
7. Sign out → session cleared, redirected back to the app/sign-in.

## Gotchas

- **Preview deployments won't do SSO.** Only the `learning-agent-pearl.vercel.app` alias matches
  the registered redirect URI. That's intended. `AUTH_URL` pins it.
- If you ever get an Okta `redirect_uri` mismatch, it's almost always the alias vs. the per-deploy
  URL — confirm `AUTH_URL` is set and the Okta app has the exact callback URI (no trailing slash).
- If login fails with an issuer/discovery error, confirm IT used the **org** server
  (`https://housecallpro.okta.com`), not a custom/"default" one — the code will log an error if so.

## Compliance (verified against HCP Okta Web App standard)

- ✅ Token exchange + storage entirely server-side; browser holds only the session cookie.
- ✅ Authorization Code + PKCE (S256) + state; no implicit; no DPoP.
- ✅ Client secret read only from `AUTH_OKTA_SECRET` (no `NEXT_PUBLIC_` prefix); never logged.
- ✅ Org issuer enforced; redirect URIs exact + HTTPS; Vercel preview pitfall handled via `AUTH_URL`.
- ✅ Prod is a separate Okta app from non-prod.
