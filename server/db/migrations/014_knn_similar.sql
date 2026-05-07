-- ============================================================================
-- Vozila.hr - KNN similar listings RPC for VDP
-- Migration: 014_knn_similar.sql
-- Idempotent.
-- ============================================================================
--
-- search_similar_listings(p_listing_id, p_limit) ranks active listings other
-- than the seed by:
--   * same category_slug → +50 base
--   * price proximity     → up to +25 (gauss-like, 5k EUR sigma)
--   * year proximity      → up to +15 (3y sigma)
--   * mileage proximity   → up to +10 (40k km sigma)
--   * same make           → +5
--
-- Pure SQL, no PostGIS — proximity is L1 with bounded falloff so a small
-- difference rewards strongly and a huge one decays to zero.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_similar_listings(
  p_listing_id UUID,
  p_limit INT DEFAULT 6
) RETURNS TABLE (
  id UUID,
  title TEXT,
  price NUMERIC,
  main_image TEXT,
  category_slug TEXT,
  attributes JSONB,
  similarity_score NUMERIC
)
LANGUAGE sql STABLE AS $$
  WITH seed AS (
    SELECT
      l.id,
      l.category_slug,
      l.price,
      (l.attributes->>'year')::INT     AS year,
      (l.attributes->>'mileage_km')::INT AS mileage_km,
      l.attributes->>'make'            AS make
    FROM listings l
    WHERE l.id = p_listing_id
  )
  SELECT
    l.id,
    l.title,
    l.price,
    l.main_image,
    l.category_slug,
    l.attributes,
    (
      CASE WHEN l.category_slug = seed.category_slug THEN 50 ELSE 0 END
      + GREATEST(0, 25 - LEAST(25, ABS(COALESCE(l.price, 0) - COALESCE(seed.price, 0)) / 200.0))
      + GREATEST(0, 15 - LEAST(15, ABS(COALESCE((l.attributes->>'year')::INT, 0) - COALESCE(seed.year, 0)) * 5))
      + GREATEST(0, 10 - LEAST(10, ABS(COALESCE((l.attributes->>'mileage_km')::INT, 0) - COALESCE(seed.mileage_km, 0)) / 4000.0))
      + CASE WHEN l.attributes->>'make' = seed.make THEN 5 ELSE 0 END
    )::NUMERIC AS similarity_score
  FROM listings l
  CROSS JOIN seed
  WHERE l.id <> p_listing_id
    AND l.status = 'active'
  ORDER BY similarity_score DESC, l.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_similar_listings(UUID, INT) TO anon, authenticated;

COMMENT ON FUNCTION public.search_similar_listings(UUID, INT) IS
  'KNN similar-listings ranker. Used on VDP to surface 6 nearby vehicles.';

NOTIFY pgrst, 'reload schema';
