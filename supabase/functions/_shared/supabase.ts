// Server-side Supabase client. Uses service-role key — bypasses RLS.
// NEVER import this from client code.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!url || !serviceKey) {
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — Edge Function will fail.",
  );
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Build a per-request client that respects the user's JWT — used to verify
// listing ownership before creating a Checkout session.
export function supabaseAsUser(authHeader: string | null) {
  return createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
}
