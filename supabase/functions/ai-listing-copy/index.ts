// POST /functions/v1/ai-listing-copy
// Body: { make, model, year, mileage, fuel, transmission, power_hp,
//         body_type, color, condition, equipment[], title, language }
// Auth: user JWT (so we can rate-limit per user later).
//
// Wraps Anthropic Claude Haiku to generate a Croatian listing description
// in Dino's direct-response voice. Capped at ~400 tokens out.

import { preflight, json } from "../_shared/cors.ts";
import { supabaseAsUser } from "../_shared/supabase.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";

interface Body {
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  power_hp?: number;
  body_type?: string;
  color?: string;
  condition?: string;
  equipment?: string[];
  title?: string;
  language?: string;
}

function systemPrompt(): string {
  return [
    "You are a Croatian automotive copywriter for Vozila.hr.",
    "Voice: forensic-premium, direct-response, no hype, no emojis.",
    "Style: short sentences. Specifics over adjectives. State facts the buyer cares about.",
    "Always return Croatian unless told otherwise.",
    "Never invent specs. If a field is missing, omit it gracefully.",
    "Never write a marketing slogan. Lead with: condition, year, key spec, mileage.",
    "Length: 110–180 words. No headings. One paragraph.",
    "End with one concrete CTA appropriate to a vehicle marketplace (e.g. 'Mogući dogovor pri pregledu.').",
  ].join(" ");
}

function userPrompt(b: Body): string {
  const lines: string[] = [];
  lines.push(`Listing title: ${b.title ?? "(no title)"}`);
  if (b.make) lines.push(`Make: ${b.make}`);
  if (b.model) lines.push(`Model: ${b.model}`);
  if (b.year) lines.push(`Year: ${b.year}`);
  if (b.mileage !== undefined) lines.push(`Mileage: ${b.mileage} km`);
  if (b.fuel) lines.push(`Fuel: ${b.fuel}`);
  if (b.transmission) lines.push(`Transmission: ${b.transmission}`);
  if (b.power_hp) lines.push(`Power: ${b.power_hp} hp`);
  if (b.body_type) lines.push(`Body: ${b.body_type}`);
  if (b.color) lines.push(`Color: ${b.color}`);
  if (b.condition) lines.push(`Condition: ${b.condition}`);
  if (b.equipment && b.equipment.length) {
    lines.push(`Equipment: ${b.equipment.slice(0, 20).join(", ")}`);
  }
  lines.push("");
  lines.push("Write the description in Croatian.");
  return lines.join("\n");
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "AI generator nije konfiguriran (ANTHROPIC_API_KEY)." }, 503);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Auth required" }, 401);

  const supabase = supabaseAsUser(authHeader);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Auth invalid" }, 401);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }

  // Cheap soft-rate-limit: 30 calls / hour / user. Tracked via a notifications-
  // table-style sentinel. Skipped until profile rows exist.
  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("type", "ai_copy_call")
    .gte("created_at", sinceIso);
  if ((count ?? 0) > 30) {
    return json({ error: "Previše zahtjeva. Pokušajte za sat vremena." }, 429);
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: systemPrompt(),
        messages: [{ role: "user", content: userPrompt(body) }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn("[ai] anthropic error", res.status, errBody);
      return json({ error: `AI error (${res.status})` }, 502);
    }

    const j = await res.json();
    const description = j?.content?.[0]?.text?.trim() ?? "";
    if (!description) return json({ error: "Prazan odgovor AI generatora." }, 502);

    // Log call (best-effort).
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "ai_copy_call",
      payload: { tokens_in: j?.usage?.input_tokens ?? null, tokens_out: j?.usage?.output_tokens ?? null },
    });

    return json({ description });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return json({ error: msg }, 500);
  }
});
