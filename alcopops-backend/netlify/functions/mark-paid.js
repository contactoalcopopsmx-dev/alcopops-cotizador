import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const adminKey = req.headers.get("x-admin-key");
  if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
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
    const record = await store.get(body.folio, { type: "json" });
    if (!record) {
      return new Response(JSON.stringify({ error: "No existe esa cotización" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    record.paid = !!body.paid;
    await store.setJSON(body.folio, record);

    let indexList = [];
    try { indexList = (await store.get("_index", { type: "json" })) || []; } catch (e) { indexList = []; }
    const idx = indexList.findIndex((x) => x.folio === body.folio);
    if (idx >= 0) {
      indexList[idx].paid = record.paid;
      await store.setJSON("_index", indexList);
    }

    return new Response(JSON.stringify({ ok: true, paid: record.paid }), {
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

export const config = { path: "/api/mark-paid" };
