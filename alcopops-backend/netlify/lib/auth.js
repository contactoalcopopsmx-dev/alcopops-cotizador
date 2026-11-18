import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

// Verificación de la clave de admin con:
//  - comparación en tiempo constante (evita adivinar la clave por tiempos de respuesta)
//  - bloqueo temporal por IP tras varios intentos fallidos (evita fuerza bruta)
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

const sha = (s) => createHash("sha256").update(String(s)).digest();
const same = (a, b) => timingSafeEqual(sha(a), sha(b));

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

function clientId(req) {
  const ip = req.headers.get("x-nf-client-connection-ip") ||
             (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  return "fail-" + createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

// Devuelve null si la clave es correcta; si no, un Response de error listo para regresar.
export async function requireAdmin(req) {
  const secret = process.env.ADMIN_KEY;
  if (!secret) return json(503, { error: "ADMIN_KEY no está configurada en Netlify" });

  const supplied = req.headers.get("x-admin-key") || "";
  let store = null, id = null, rec = null;
  try {
    store = getStore("seguridad");
    id = clientId(req);
    rec = await store.get(id, { type: "json" });
  } catch (e) { store = null; }

  const now = Date.now();
  if (rec && rec.count >= MAX_FAILS && now - rec.first < LOCK_MS) {
    const mins = Math.ceil((LOCK_MS - (now - rec.first)) / 60000);
    return json(429, { error: `Demasiados intentos. Intenta de nuevo en ${mins} min.`, retryMinutes: mins });
  }

  if (supplied && same(supplied, secret)) {
    if (store && rec) { try { await store.delete(id); } catch (e) {} }
    return null;
  }

  // Intento fallido (solo cuenta si se envió una clave)
  if (supplied && store) {
    const fresh = !rec || now - rec.first >= LOCK_MS;
    try {
      await store.setJSON(id, { count: fresh ? 1 : rec.count + 1, first: fresh ? now : rec.first });
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 600)); // frena ráfagas de intentos
  }
  return json(401, { error: "No autorizado" });
}
