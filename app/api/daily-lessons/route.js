import { NextResponse } from 'next/server';
import { readDailyLessons, writeDailyLessons, getAvailableDates, todayDateString } from '@/lib/daily-lessons';
import { isAdmin } from '@/lib/admin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'lessons';

    if (action === 'dates') {
      const dates = await getAvailableDates();
      return NextResponse.json({ dates });
    }

    const date = searchParams.get('date') || todayDateString();
    const data = await readDailyLessons(date);

    if (!data) {
      return NextResponse.json({ date, lessons: [], generatedAt: null });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Daily lessons fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, date, lessonId, userEmail } = body;

    if (!await isAdmin(userEmail)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (action === 'pin' || action === 'unpin') {
      const data = await readDailyLessons(date);
      if (!data) {
        return NextResponse.json({ error: 'No lessons for this date' }, { status: 404 });
      }

      const updated = {
        ...data,
        lessons: data.lessons.map(l =>
          l.id === lessonId
            ? { ...l, pinned: action === 'pin', pinnedBy: action === 'pin' ? userEmail : null }
            : l
        ),
      };

      await writeDailyLessons(date, updated);
      return NextResponse.json({ ok: true, lessons: updated.lessons });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Daily lessons POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
