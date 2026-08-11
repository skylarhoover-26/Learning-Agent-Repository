import { timingSafeEqual } from 'node:crypto';

// Cron-route auth. The old inline check was `authHeader !== \`Bearer ${process.env.CRON_SECRET}\``,
// which template-expands to the literal string "Bearer undefined" when the env
// var is missing — so anyone sending that exact header passed (security review
// F-08). This fails closed instead: no secret configured, no access.
//
// Usage:
//   const denied = requireCronSecret(request);
//   if (denied) return denied;
//
// Returns a Response (503 misconfigured / 401 unauthorized) or null when the
// caller presented the right secret.
export function requireCronSecret(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  const provided = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, so compare lengths first. The
  // length itself isn't a secret — the value is.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
