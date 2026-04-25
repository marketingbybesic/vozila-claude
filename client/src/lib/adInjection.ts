/**
 * Inject sponsored ads into listing grid
 * Places one ad every 5th item
 */
export const injectAdsIntoListings = <T extends { id: string }>(
  listings: T[],
  sponsoredListings: T[]
): (T | { type: 'sponsored'; data: T })[] => {
  const result: (T | { type: 'sponsored'; data: T })[] = [];
  let adIndex = 0;

  listings.forEach((listing, index) => {
    result.push(listing);

    // Inject ad every 5 items (after positions 4, 9, 14, etc.)
    if ((index + 1) % 5 === 0 && adIndex < sponsoredListings.length) {
      result.push({
        type: 'sponsored',
        data: sponsoredListings[adIndex],
      });
      adIndex++;
    }
  });

  return result;
};

/**
 * Get featured listings (is_featured = true)
 * These should be prioritized in search results
 */
export const filterFeaturedListings = <T extends { is_featured?: boolean }>(
  listings: T[]
): T[] => {
  return listings.filter(listing => listing.is_featured === true);
};

/**
 * Sort listings with featured items first
 */
export const sortWithFeaturedFirst = <T extends { is_featured?: boolean }>(
  listings: T[]
): T[] => {
  return [...listings].sort((a, b) => {
    const aFeatured = a.is_featured ? 1 : 0;
    const bFeatured = b.is_featured ? 1 : 0;
    return bFeatured - aFeatured;
  });
};
