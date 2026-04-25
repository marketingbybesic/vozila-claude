import { Helmet } from 'react-helmet-async';
import { Listing } from '../../types';

interface SEOHeadProps {
  listing: Listing;
  baseUrl?: string;
  imageUrl?: string;
}

/**
 * Generate SEO meta tags for listing pages
 * Supports dynamic titles, OpenGraph, and canonical URLs
 */
export const SEOHead = ({
  listing,
  baseUrl = 'https://vozila.hr',
  imageUrl,
}: SEOHeadProps) => {
  // Extract brand and model from attributes or title
  const brand = listing.attributes?.marka || '';
  const model = listing.attributes?.model || '';
  const year = listing.attributes?.godiste || '';

  // Generate dynamic title
  const title = year
    ? `${brand} ${model} (${year}) | Vozila.hr`
    : `${brand} ${model} | Vozila.hr`;

  // Generate description
  const description =
    listing.description?.substring(0, 160) ||
    `${brand} ${model} - ${listing.price.toLocaleString()} €. ${listing.location || 'Hrvatska'}`;

  // Get primary image
  const ogImage =
    imageUrl ||
    listing.listing_images?.[0]?.url ||
    `${baseUrl}/og-default.jpg`;

  // Build canonical URL
  const canonicalUrl = `${baseUrl}/listing/${listing.id}`;

  // Build OpenGraph URL
  const ogUrl = canonicalUrl;

  // Determine if listing is archived
  const isArchived = listing.status === 'inactive';

  // Generate keywords
  const keywords = [
    brand,
    model,
    year,
    listing.location,
    listing.category_slug?.replace('-', ' '),
    listing.listing_type === 'najam' ? 'najam' : 'prodaja',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="language" content="hr" />
      <meta name="author" content="Vozila.hr" />

      {/* Canonical URL - Important for archived listings */}
      <link rel="canonical" href={canonicalUrl} />

      {/* OpenGraph Meta Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Vozila.hr" />
      <meta property="og:locale" content="hr_HR" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@vozila_hr" />

      {/* Additional Meta Tags */}
      <meta name="robots" content={isArchived ? 'noindex, follow' : 'index, follow'} />
      <meta name="revisit-after" content="7 days" />
      <meta name="rating" content="general" />

      {/* Listing-specific Meta Tags */}
      <meta property="product:price:amount" content={listing.price.toString()} />
      <meta property="product:price:currency" content={listing.currency || 'EUR'} />
      <meta property="product:category" content={listing.category_slug || ''} />

      {/* Structured Data - JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: title,
          description: description,
          image: ogImage,
          brand: {
            '@type': 'Brand',
            name: brand,
          },
          offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: listing.currency || 'EUR',
            price: listing.price.toString(),
            availability: isArchived ? 'OutOfStock' : 'InStock',
            seller: {
              '@type': 'Organization',
              name: 'Vozila.hr',
            },
          },
          aggregateRating: listing.attributes?.rating
            ? {
                '@type': 'AggregateRating',
                ratingValue: listing.attributes.rating,
                ratingCount: listing.attributes.ratingCount || 1,
              }
            : undefined,
        })}
      </script>

      {/* Alternate Language Links */}
      <link rel="alternate" hrefLang="hr" href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* Additional SEO Meta Tags */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    </Helmet>
  );
};

/**
 * Generate SEO meta tags for category/listing feed pages
 */
export const SEOHeadCategory = ({
  categoryName,
  categorySlug,
  description,
  baseUrl = 'https://vozila.hr',
  listingCount = 0,
}: {
  categoryName: string;
  categorySlug: string;
  description: string;
  baseUrl?: string;
  listingCount?: number;
}) => {
  const title = `${categoryName} | Vozila.hr`;
  const canonicalUrl = `${baseUrl}/${categorySlug}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="language" content="hr" />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* OpenGraph Meta Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Vozila.hr" />
      <meta property="og:locale" content="hr_HR" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {/* Robots Meta Tag */}
      <meta name="robots" content="index, follow" />
      <meta name="revisit-after" content="7 days" />

      {/* Structured Data - JSON-LD for CollectionPage */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: categoryName,
          description: description,
          url: canonicalUrl,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: listingCount,
          },
        })}
      </script>

      {/* Alternate Language Links */}
      <link rel="alternate" hrefLang="hr" href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
    </Helmet>
  );
};

/**
 * Generate SEO meta tags for homepage
 */
export const SEOHeadHome = ({
  baseUrl = 'https://vozila.hr',
}: {
  baseUrl?: string;
} = {}) => {
  const title = 'Vozila.hr - Kupuj i Prodaj Vozila Online';
  const description =
    'Pronađi svoje idealno vozilo na Vozila.hr. Najveća baza automobila, motocikala i strojeva u Hrvatskoj. Sigurna kupnja i prodaja vozila online.';
  const canonicalUrl = baseUrl;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="language" content="hr" />
      <meta name="author" content="Vozila.hr" />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* OpenGraph Meta Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={`${baseUrl}/og-home.jpg`} />
      <meta property="og:site_name" content="Vozila.hr" />
      <meta property="og:locale" content="hr_HR" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${baseUrl}/og-home.jpg`} />
      <meta name="twitter:site" content="@vozila_hr" />

      {/* Robots Meta Tag */}
      <meta name="robots" content="index, follow" />
      <meta name="revisit-after" content="7 days" />

      {/* Structured Data - JSON-LD for Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Vozila.hr',
          url: canonicalUrl,
          logo: `${baseUrl}/logo.png`,
          description: description,
          sameAs: [
            'https://www.facebook.com/vozila.hr',
            'https://www.instagram.com/vozila.hr',
            'https://twitter.com/vozila_hr',
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Support',
            email: 'support@vozila.hr',
          },
        })}
      </script>

      {/* Alternate Language Links */}
      <link rel="alternate" hrefLang="hr" href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
    </Helmet>
  );
};
