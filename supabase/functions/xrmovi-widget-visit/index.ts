// Recebe somente um identificador aleatório diário após consentimento de analytics.
// Não registra IP, user-agent, e-mail, URL visitada ou identificadores de cliente.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
const ORIGINS = new Set(["https://frota.nospassa.com.br","https://www.frota.nospassa.com.br","https://xrmovi.com.br","https://www.xrmovi.com.br"]);
const headers = {
  "Access-Control-Allow-Origin": "https://xrmovi.com.br",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const respond = (status: number, origin = "") => new Response(null,{status,headers:{...headers,"Access-Control-Allow-Origin":ORIGINS.has(origin)?origin:"https://xrmovi.com.br"}});
Deno.serve(async (req:Request) => {
  const origin = req.headers.get("origin");
  if (!origin || !ORIGINS.has(origin)) return respond(403,origin);
  if (req.method === "OPTIONS") return respond(204,origin);
  if (req.method !== "POST") return respond(405,origin);
  if (!(req.headers.get("content-type") || "").includes("application/json")) return respond(415,origin);
  if (Number(req.headers.get("content-length") || 0) > 256) return respond(413,origin);
  try {
    const raw = await req.text();
    if (raw.length > 256) return respond(413,origin);
    const input = JSON.parse(raw);
    if (typeof input?.visitor_id !== "string" || !uuid.test(input.visitor_id)) return respond(400,origin);
    const url = Deno.env.get("SUPABASE_URL");
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !secret) return respond(503,origin);
    const client = createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const {error} = await client.rpc("xrmovi_widget_record_visit",{p_visitor:input.visitor_id});
    if (error) {console.error("Visit ping failed", error.code || "unknown");return respond(503,origin);}
    return respond(204,origin);
  } catch {return respond(400,origin);}
});