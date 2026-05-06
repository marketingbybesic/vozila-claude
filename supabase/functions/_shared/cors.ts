// Shared CORS headers for all Vozila Edge Functions.
// SECURITY_AUDIT S4: replaced wildcard `*` with origin allowlist that
// echoes the request Origin only when it matches a known domain.
// Defaults catch dev (vite, localhost) + the two production-ish hosts.
//
// Override / extend in Supabase secrets via CORS_EXTRA_ORIGINS — comma
// separated list — for staging or PR previews.

const DEFAULT_ALLOWLIST = [
  "https://vozila.hr",
  "https://www.vozila.hr",
  "https://testiranje.cloud",
  "https://www.testiranje.cloud",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5174",
];

function allowlist(): string[] {
  const extra = (Deno.env.get("CORS_EXTRA_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_ALLOWLIST, ...extra];
}

function pickOrigin(req?: Request): string {
  const origin = req?.headers.get("Origin") ?? "";
  if (!origin) return "https://vozila.hr";  // safe default for non-browser callers
  return allowlist().includes(origin) ? origin : "https://vozila.hr";
}

// Static export keeps backward compat with existing functions that import
// corsHeaders directly. Origin is the safe default; for browser-CORS use
// preflight()/json() helpers below which echo the request origin.
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://vozila.hr",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Vary": "Origin",
};

// Build per-request CORS headers that echo the caller's Origin only when
// it's in the allowlist. Falls back to https://vozila.hr otherwise.
function corsFor(req?: Request): Record<string, string> {
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": pickOrigin(req),
  };
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsFor(req) });
  }
  return null;
}

export function json(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });
}
