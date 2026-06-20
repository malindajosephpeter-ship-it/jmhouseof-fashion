// Shared state API for JM House of Fashion.
//
// The browser app keeps its entire database as one JSON object. This Function
// stores that object centrally in Netlify Database (a single row, id = 'main')
// so the data follows the business across every device, not just one browser.
//
//   GET  /api/state           -> { data, rev, updatedAt }   (data is null if empty)
//   PUT  /api/state  { data }  -> { ok, rev, updatedAt }     (upsert, bumps rev)
import { getDatabase } from "@netlify/database";

const ID = "main";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  let db;
  try {
    db = getDatabase();
  } catch (e) {
    return json({ error: "database-unavailable" }, 503);
  }

  if (req.method === "GET") {
    const rows = await db.sql`SELECT data, rev, updated_at FROM app_state WHERE id = ${ID}`;
    if (!rows.length) return json({ data: null, rev: 0, updatedAt: null });
    const r = rows[0];
    return json({ data: r.data, rev: Number(r.rev), updatedAt: r.updated_at });
  }

  if (req.method === "PUT" || req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return json({ error: "invalid-json" }, 400);
    }
    if (!body || typeof body.data !== "object" || body.data === null) {
      return json({ error: "missing-data" }, 400);
    }
    const payload = JSON.stringify(body.data);
    const rows = await db.sql`
      INSERT INTO app_state (id, data, rev, updated_at)
      VALUES (${ID}, ${payload}::jsonb, 1, NOW())
      ON CONFLICT (id) DO UPDATE
        SET data = EXCLUDED.data,
            rev = app_state.rev + 1,
            updated_at = NOW()
      RETURNING rev, updated_at`;
    const r = rows[0];
    return json({ ok: true, rev: Number(r.rev), updatedAt: r.updated_at });
  }

  return json({ error: "method-not-allowed" }, 405);
};

export const config = { path: "/api/state" };
