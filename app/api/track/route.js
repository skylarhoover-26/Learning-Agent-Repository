import { NextResponse } from 'next/server';
import { logAuditEntry } from '@/lib/audit-log';

export async function POST(request) {
  try {
    const { event, data, user } = await request.json();

    if (!event) {
      return NextResponse.json({ error: 'Missing event' }, { status: 400 });
    }

    logAuditEntry({
      type: event,
      endpoint: '/api/track',
      user: user || { email: 'unknown', name: 'Unknown' },
      model: 'n/a',
      input: data || {},
      output: { tracked: true },
      durationMs: 0,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/track error:', error);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}
