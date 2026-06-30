import { buildAndStoreReport } from '@/lib/reporting';

// Daily cron (see vercel.json): rebuilds the cached reporting snapshot so viewers
// always load a fresh-but-precomputed report instead of triggering the heavy
// build on every click. Protected by CRON_SECRET, same as the curriculum cron.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const report = await buildAndStoreReport();
  return Response.json({
    ok: true,
    generatedAt: report.generatedAt,
    people: report.people?.length || 0,
  });
}
