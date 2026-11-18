import { requireAdmin } from "../lib/auth.js";

// El panel usa este endpoint para validar la clave de verdad (en el servidor).
export default async (req) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { "Content-Type": "application/json" }
  });
};

export const config = { path: "/api/verify-admin" };
