import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { navigationMenu } from '../../config/taxonomy';
import { ListingFeed } from '../listings/ListingFeed';

const NotFound = lazy(() => import('../../pages/NotFound').then(m => ({ default: m.NotFound })));

const KNOWN_CATEGORY_SLUGS: ReadonlySet<string> = new Set(
  navigationMenu.map((c) => c.slug)
);

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

/**
 * Guards `/:categorySlug` so unknown one-segment paths render NotFound
 * instead of an empty ListingFeed. Without this, /this-route-does-not-exist
 * matches the wildcard and shows a confusing empty results page.
 */
export const CategoryRouteGuard = () => {
  const { categorySlug } = useParams();
  if (!categorySlug || !KNOWN_CATEGORY_SLUGS.has(categorySlug)) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <NotFound />
      </Suspense>
    );
  }
  return <ListingFeed />;
};
