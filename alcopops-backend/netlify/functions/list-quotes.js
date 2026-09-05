import { getStore } from "@netlify/blobs";

export default async () => {
  try {
    const store = getStore("cotizaciones");
    const indexList = (await store.get("_index", { type: "json" })) || [];

    return new Response(JSON.stringify(indexList), {
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

export const config = { path: "/api/list-quotes" };
