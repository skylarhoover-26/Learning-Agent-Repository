// Routes that have been reskinned in the cinematic style. These render their
// own cinematic shell (top bar + overlay drawer), so the shared light chrome
// (SideNav / MenuStrip / docked content push) is suppressed on them. Grow this
// list as the reskin rolls out screen by screen.
export const CINEMATIC_ROUTES = ['/', '/achievements', '/leaderboard', '/goals', '/quests'];

export function isCinematicRoute(pathname) {
  return CINEMATIC_ROUTES.includes(pathname);
}
