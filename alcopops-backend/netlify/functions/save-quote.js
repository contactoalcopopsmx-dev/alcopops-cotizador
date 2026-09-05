import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();

    if (!body || !body.folio) {
      return new Response(JSON.stringify({ error: "Falta el folio" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const store = getStore("cotizaciones");

    // Save the full quote under its folio.
    await store.setJSON(body.folio, body);

    // Maintain a lightweight index for the history view, so we don't have
    // to list/read every single quote just to show a summary table.
    let indexList = [];
    try {
      indexList = (await store.get("_index", { type: "json" })) || [];
    } catch (e) {
      indexList = [];
    }

    const summary = {
      folio: body.folio,
      client: body.client || "",
      eventType: body.eventType || "",
      eventDate: body.eventDate || "",
      guests: body.guests || "",
      savedAt: new Date().toISOString()
    };

    const idx = indexList.findIndex((x) => x.folio === body.folio);
    if (idx >= 0) {
      indexList[idx] = summary;
    } else {
      indexList.unshift(summary);
    }

    await store.setJSON("_index", indexList);

    return new Response(JSON.stringify({ ok: true, folio: body.folio }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err && err.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = { path: "/api/save-quote" };
