# SEO Setup Guide - react-helmet-async

## Installation

### Step 1: Install Dependencies

```bash
npm install react-helmet-async
# or
yarn add react-helmet-async
```

### Step 2: Setup HelmetProvider in App.tsx

```typescript
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router } from 'react-router-dom';

function App() {
  return (
    <HelmetProvider>
      <Router>
        {/* Your app routes */}
      </Router>
    </HelmetProvider>
  );
}

export default App;
```

### Step 3: Import SEOHead in Components

```typescript
import { SEOHead } from '@/components/seo/SEOHead';

export const ListingDetail = () => {
  const [listing, setListing] = useState<Listing | null>(null);

  return (
    <>
      {listing && <SEOHead listing={listing} />}
      {/* Listing content */}
    </>
  );
};
```

## Usage Examples

### Listing Detail Page

```typescript
import { SEOHead } from '@/components/seo/SEOHead';

export const ListingDetail = () => {
  const { id } = useParams();
  const [listing, setListing] = useState<Listing | null>(null);

  useEffect(() => {
    // Fetch listing
    const fetchListing = async () => {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();
      setListing(data);
    };
    fetchListing();
  }, [id]);

  if (!listing) return <div>Loading...</div>;

  return (
    <>
      <SEOHead
        listing={listing}
        baseUrl="https://vozila.hr"
        imageUrl={listing.listing_images?.[0]?.url}
      />
      {/* Listing content */}
    </>
  );
};
```

### Category Page

```typescript
import { SEOHeadCategory } from '@/components/seo/SEOHead';

export const CategoryPage = () => {
  const { categorySlug } = useParams();
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    // Fetch listings for category
  }, [categorySlug]);

  const category = navigationMenu.find(c => c.slug === categorySlug);

  return (
    <>
      <SEOHeadCategory
        categoryName={category?.name || ''}
        categorySlug={categorySlug || ''}
        description={`Pronađi ${category?.name} na Vozila.hr. ${listings.length} oglasa dostupno.`}
        listingCount={listings.length}
      />
      {/* Category content */}
    </>
  );
};
```

### Homepage

```typescript
import { SEOHeadHome } from '@/components/seo/SEOHead';

export const Home = () => {
  return (
    <>
      <SEOHeadHome baseUrl="https://vozila.hr" />
      {/* Homepage content */}
    </>
  );
};
```

## Meta Tags Generated

### Listing Detail Page

**Title Format**:
```
[Marka] [Model] ([Godište]) | Vozila.hr
Example: BMW 320d (2022) | Vozila.hr
```

**Meta Tags**:
- `description`: First 160 characters of listing description
- `keywords`: Brand, model, year, location, category, type
- `og:title`: Same as page title
- `og:description`: Listing description
- `og:image`: Primary listing image
- `og:url`: Canonical listing URL
- `twitter:card`: summary_large_image
- `canonical`: Listing URL (important for archived listings)
- `robots`: "noindex, follow" for inactive listings, "index, follow" for active

**Structured Data (JSON-LD)**:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "BMW 320d (2022) | Vozila.hr",
  "description": "Listing description...",
  "image": "https://example.com/image.jpg",
  "brand": {
    "@type": "Brand",
    "name": "BMW"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://vozila.hr/listing/123",
    "priceCurrency": "EUR",
    "price": "25000",
    "availability": "InStock"
  }
}
```

## SEO Best Practices

### 1. Canonical URLs
- Every listing has a canonical URL
- Archived listings still have canonical URLs (prevents duplicate content issues)
- Format: `https://vozila.hr/listing/{id}`

### 2. OpenGraph Images
- Use listing's primary image as OG image
- Recommended size: 1200x630px
- Fallback to default OG image if no listing image

### 3. Robots Meta Tag
- Active listings: `index, follow`
- Inactive/archived listings: `noindex, follow`
- Prevents search engines from indexing sold listings

### 4. Structured Data
- Product schema for listings
- CollectionPage schema for category pages
- Organization schema for homepage
- Helps Google understand content better

### 5. Title Format
- Consistent format: `[Brand] [Model] ([Year]) | Vozila.hr`
- Includes brand, model, year for better SEO
- Includes site name for branding

### 6. Description
- First 160 characters of listing description
- Includes price, location, category
- Fallback to auto-generated description

## Optimization Tips

### For Listings
1. Write detailed descriptions (150+ characters)
2. Include brand, model, year in title
3. Use high-quality images (1200x630px minimum)
4. Keep price and location in description

### For Categories
1. Write unique category descriptions
2. Include listing count
3. Use relevant keywords
4. Link to popular listings

### For Homepage
1. Include company description
2. Link to social media
3. Use organization schema
4. Include contact information

## Testing SEO

### 1. Google Search Console
- Submit sitemap
- Monitor indexing status
- Check for crawl errors
- Review search performance

### 2. Facebook Debugger
- Test OG tags: https://developers.facebook.com/tools/debug/
- Verify image display
- Check title and description

### 3. Twitter Card Validator
- Test Twitter cards: https://cards-dev.twitter.com/validator
- Verify image and text

### 4. Schema.org Validator
- Test structured data: https://validator.schema.org/
- Verify JSON-LD format

### 5. Lighthouse
- Run Lighthouse audit
- Check SEO score
- Verify mobile-friendly

## Common Issues

### Issue: OG Image Not Showing
**Solution**: Ensure image URL is absolute (includes https://)
```typescript
// WRONG
imageUrl="/images/listing.jpg"

// CORRECT
imageUrl="https://vozila.hr/images/listing.jpg"
```

### Issue: Canonical URL Not Working
**Solution**: Ensure canonical URL is absolute
```typescript
// WRONG
canonicalUrl="/listing/123"

// CORRECT
canonicalUrl="https://vozila.hr/listing/123"
```

### Issue: Archived Listings Still Indexed
**Solution**: Ensure `robots` meta tag is set correctly
```typescript
<meta name="robots" content={isArchived ? 'noindex, follow' : 'index, follow'} />
```

### Issue: Duplicate Content
**Solution**: Always include canonical URL
```typescript
<link rel="canonical" href={canonicalUrl} />
```

## Performance Considerations

### 1. Lazy Load Images
- Don't load all images on page load
- Use lazy loading for listing images
- Improves page speed

### 2. Optimize Images
- Compress images before upload
- Use WebP format when possible
- Provide multiple sizes (srcset)

### 3. Cache Meta Tags
- Cache listing data
- Reduce database queries
- Improve response time

### 4. Minify JSON-LD
- Minify structured data
- Reduce page size
- Improve load time

## Monitoring & Analytics

### 1. Google Analytics
- Track listing page views
- Monitor bounce rate
- Track conversions

### 2. Search Console
- Monitor impressions
- Track click-through rate
- Identify indexing issues

### 3. Social Media Analytics
- Track shares
- Monitor engagement
- Identify popular listings

## Future Enhancements

- [ ] Add breadcrumb schema
- [ ] Implement FAQ schema
- [ ] Add video schema for video listings
- [ ] Create dynamic sitemap
- [ ] Add hreflang for multi-language support
- [ ] Implement AMP pages
- [ ] Add rich snippets for reviews

## Resources

- [React Helmet Async Docs](https://github.com/steverep/react-helmet-async)
- [Schema.org Documentation](https://schema.org/)
- [Google Search Central](https://developers.google.com/search)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
