import { getStore } from "@netlify/blobs";
import { requireAdmin } from "../lib/auth.js";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();

    if (!body || !body.folio) {
      return new Response(JSON.stringify({ error: "Falta el folio" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const store = getStore("cotizaciones");

    // Preserve confirmed/paid flags if this folio already existed (e.g. re-saving after an edit).
    let existing = null;
    try { existing = await store.get(body.folio, { type: "json" }); } catch (e) { existing = null; }

    const fullRecord = {
      ...body,
      savedAt: existing && existing.savedAt ? existing.savedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmed: existing ? !!existing.confirmed : false,
      confirmedAt: existing ? existing.confirmedAt || null : null,
      paid: existing ? !!existing.paid : false
    };

    await store.setJSON(body.folio, fullRecord);

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
      savedAt: fullRecord.savedAt,
      confirmed: fullRecord.confirmed,
      paid: fullRecord.paid
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
