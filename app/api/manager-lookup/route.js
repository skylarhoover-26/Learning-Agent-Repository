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
      console.error('n8n webhook returned', res.status);
      return Response.json({ error: 'Snowflake lookup failed.' }, { status: 502 });
    }

    const text = await res.text();
    if (!text || text.trim().length === 0) {
      return Response.json(
        { error: 'No results found. The Snowflake query returned empty — check that the n8n workflow has valid Snowflake credentials and the correct query.' },
        { status: 502 }
      );
    }

    try {
      const data = JSON.parse(text);
      return Response.json(data);
    } catch {
      console.error('n8n returned non-JSON:', text.slice(0, 200));
      return Response.json(
        { error: 'Received an unexpected response from the lookup service.' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Manager lookup error:', error);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
