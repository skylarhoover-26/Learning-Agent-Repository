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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let res;
    try {
      res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerName: name.trim() }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError.name === 'AbortError') {
        return Response.json(
          { error: 'Snowflake lookup timed out after 30 seconds. The n8n workflow or Snowflake may be unresponsive — try again in a minute.' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
    clearTimeout(timeout);

    const text = await res.text();
    let parsed = null;
    try {
      parsed = text && text.trim() ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    // n8n returns 404 for two very different reasons — disambiguate them.
    if (res.status === 404) {
      const msg = parsed && typeof parsed.message === 'string' ? parsed.message : '';
      if (/not registered/i.test(msg)) {
        // The n8n workflow is inactive — a service/config issue, not a bad name.
        console.error('manager-lookup webhook not registered (workflow inactive)');
        return Response.json(
          { error: 'The lookup service is currently unavailable. Please try again in a minute.' },
          { status: 503 }
        );
      }
      // Genuine "no manager by that name."
      return Response.json(
        { error: 'No manager found by that name. Try their full name or a different spelling.', manager: null, directReports: [] },
        { status: 404 }
      );
    }

    if (!res.ok) {
      console.error('n8n webhook returned', res.status);
      return Response.json({ error: 'Snowflake lookup failed. Please try again.' }, { status: 502 });
    }

    if (!text || text.trim().length === 0) {
      return Response.json(
        { error: 'No results found. The Snowflake query returned empty — check that the n8n workflow has valid credentials and the correct query.' },
        { status: 502 }
      );
    }

    if (!parsed) {
      console.error('n8n returned non-JSON:', text.slice(0, 200));
      return Response.json(
        { error: 'Received an unexpected response from the lookup service.' },
        { status: 502 }
      );
    }

    return Response.json(parsed);
  } catch (error) {
    console.error('Manager lookup error:', error);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
