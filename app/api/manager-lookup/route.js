const WEBHOOK_URL = process.env.N8N_MANAGER_WEBHOOK_URL;

export async function POST(request) {
  if (!WEBHOOK_URL) {
    return Response.json(
      { error: 'Manager lookup not configured. Set N8N_MANAGER_WEBHOOK_URL.' },
      { status: 503 }
    );
  }

  try {
    const { name } = await request.json();
    if (!name || name.trim().length < 2) {
      return Response.json({ error: 'Please enter a valid name.' }, { status: 400 });
    }

    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerName: name.trim() }),
    });

    if (!res.ok) {
      return Response.json({ error: 'Snowflake lookup failed.' }, { status: 502 });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error('Manager lookup error:', error);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
