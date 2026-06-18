// A shared "content day" that rolls over at 8:00 AM Pacific, so everything that
// refreshes daily (suggested lessons, Today's Pick, …) flips at the same moment
// regardless of the viewer's timezone. Use contentDayKey() as a cache/seed key.

export const REFRESH_LABEL = 'Refreshes daily at 8 AM PT';

export function contentDayKey(now = new Date()) {
  // Read the current wall-clock in Pacific time (handles PST/PDT automatically).
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false,
  }).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});

  let y = +parts.year;
  let m = +parts.month;
  let d = +parts.day;
  const h = +parts.hour % 24; // some platforms emit "24" at midnight

  // Before 8 AM Pacific still belongs to the previous content day.
  if (h < 8) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - 1);
    y = dt.getUTCFullYear();
    m = dt.getUTCMonth() + 1;
    d = dt.getUTCDate();
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
