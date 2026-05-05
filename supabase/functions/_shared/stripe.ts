// Stripe client + tier mappings for boost (one-shot) and subs (recurring).

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

export type BoostTierId = "top-2d" | "featured-7d" | "premium-30d";

export const BOOST_DURATION_DAYS: Record<BoostTierId, number> = {
  "top-2d": 2,
  "featured-7d": 7,
  "premium-30d": 30,
};

export function isValidBoostTier(t: string): t is BoostTierId {
  return t === "top-2d" || t === "featured-7d" || t === "premium-30d";
}

export type SubTierId = "bronze" | "silver" | "gold";

export const SUB_PRICE_ENV: Record<SubTierId, string> = {
  bronze: "STRIPE_PRICE_SUB_BRONZE",
  silver: "STRIPE_PRICE_SUB_SILVER",
  gold: "STRIPE_PRICE_SUB_GOLD",
};

export function isValidSubTier(t: string): t is SubTierId {
  return t === "bronze" || t === "silver" || t === "gold";
}

// Stripe price IDs map back to our internal tier name.
// Built lazily per request because env may not be ready at module import.
export function priceIdToSubTier(priceId: string): SubTierId | null {
  const map: Record<string, SubTierId> = {};
  for (const tier of ["bronze", "silver", "gold"] as SubTierId[]) {
    const id = Deno.env.get(SUB_PRICE_ENV[tier]);
    if (id) map[id] = tier;
  }
  return map[priceId] ?? null;
}
