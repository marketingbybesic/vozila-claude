import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryStates, parseAsString, parseAsInteger } from 'nuqs';
import { ListingFeed } from '../components/listings/ListingFeed';
import { parseSearchSlug } from '../lib/searchSlug';

/**
 * Route component for /pretraga/:slug — SEO-friendly URLs like
 *   /pretraga/bmw-320d-2018-i-noviji-do-20000
 * Hydrates nuqs query state from the slug on mount, then defers to
 * <ListingFeed/> which already does all the rendering.
 */
export const SearchSlugRoute = () => {
  const { slug } = useParams();
  const seededRef = useRef(false);

  // Same nuqs schema as ListingFeed so the seed write lands in the URL bar.
  const [, setQueryState] = useQueryStates({
    make: parseAsString.withDefault(''),
    model: parseAsString.withDefault(''),
    price_min: parseAsInteger.withDefault(0),
    price_max: parseAsInteger.withDefault(0),
    year_min: parseAsInteger.withDefault(0),
    year_max: parseAsInteger.withDefault(0),
    mileage_max: parseAsInteger.withDefault(0),
    fuel: parseAsString.withDefault(''),
    transmission: parseAsString.withDefault(''),
  });

  useEffect(() => {
    if (seededRef.current || !slug) return;
    seededRef.current = true;
    const parsed = parseSearchSlug(slug);
    setQueryState({
      make: parsed.make ?? null,
      model: parsed.model ?? null,
      price_min: parsed.price_min ?? null,
      price_max: parsed.price_max ?? null,
      year_min: parsed.year_min ?? null,
      year_max: parsed.year_max ?? null,
      mileage_max: parsed.mileage_max ?? null,
      fuel: parsed.fuel ?? null,
      transmission: parsed.transmission ?? null,
    } as any);
  }, [slug, setQueryState]);

  return <ListingFeed />;
};
