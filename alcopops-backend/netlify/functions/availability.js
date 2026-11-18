import { getStore } from "@netlify/blobs";
import { requireAdmin } from "../lib/auth.js";

// Calendario de disponibilidad. Estados: green | yellow | orange | red
// Una fecha sin registro = green (disponible).
//  GET  ?date=YYYY-MM-DD        -> público, solo regresa el estado de esa fecha
//  GET  ?all=1                  -> admin, mapa completo
//  POST {date, status}          -> admin, guarda (green borra el registro)
const VALID = ["green", "yellow", "orange", "red"];
const KEY = "_availability";
const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default async (req) => {
  try {
    const store = getStore("cotizaciones");
    const url = new URL(req.url);

    if (req.method === "POST") {
      const denied = await requireAdmin(req);
      if (denied) return denied;
      const body = await req.json();
      if (!body || !/^\d{4}-\d{2}-\d{2}$/.test(body.date || "") || !VALID.includes(body.status)) {
        return json(400, { error: "Fecha o estado inválido" });
      }
      const map = (await store.get(KEY, { type: "json" })) || {};
      if (body.status === "green") delete map[body.date]; else map[body.date] = body.status;
      await store.setJSON(KEY, map);
      return json(200, { ok: true, date: body.date, status: body.status });
    }

    if (url.searchParams.get("all")) {
      const denied = await requireAdmin(req);
      if (denied) return denied;
      return json(200, (await store.get(KEY, { type: "json" })) || {});
    }

    const date = url.searchParams.get("date") || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(400, { error: "Fecha inválida" });
    const map = (await store.get(KEY, { type: "json" })) || {};
    return json(200, { date, status: map[date] || "green" });
  } catch (err) {
    return json(500, { error: String((err && err.message) || err) });
  }
};

export const config = { path: "/api/availability" };
