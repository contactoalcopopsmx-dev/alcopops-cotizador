import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const folio = url.searchParams.get("folio");

  if (!folio) {
    return new Response(JSON.stringify({ error: "Falta el folio" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const store = getStore("cotizaciones");
    const data = await store.get(folio, { type: "json" });

    if (!data) {
      return new Response(JSON.stringify({ error: "No se encontró esa cotización" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(data), {
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

export const config = { path: "/api/get-quote" };
