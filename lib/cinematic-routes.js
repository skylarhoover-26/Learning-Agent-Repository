// Routes that have been reskinned in the cinematic style. These render their
// own cinematic shell (top bar + overlay drawer), so the shared light chrome
// (SideNav / MenuStrip / docked content push) is suppressed on them. Grow this
// list as the reskin rolls out screen by screen.
export const CINEMATIC_ROUTES = [
  '/', '/achievements', '/leaderboard',
  '/heatmap', '/calibration',
  '/discover', '/library', '/prompts', '/games',
  '/my-tools', '/my-role', '/my-tasks', '/projects', '/profile',
  '/manager', '/admin',
  '/chat', '/lesson', '/modules', '/curriculum-pipeline',
];

// Reskinned parents whose child routes inherit the cinematic chrome too, so we
// don't have to enumerate every dynamic id (e.g. /games/prompt-battle,
// /admin/users).
export const CINEMATIC_PARENTS = [
  '/games', '/admin',
];

export function isCinematicRoute(pathname) {
  if (!pathname) return false;
  if (CINEMATIC_ROUTES.includes(pathname)) return true;
  return CINEMATIC_PARENTS.some((parent) => pathname.startsWith(parent + '/'));
}
