// Stripe client + tier→duration mapping for boost.

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
