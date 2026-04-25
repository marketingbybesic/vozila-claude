# Supabase Seeding Instructions

## Overview
This document explains how to seed the Vozila database with 20 premium listings (15 published + 5 inactive).

## Seed Data Contents

### Premium Vehicles (15 Published)
1. **Porsche 911 Turbo S 2023** - €185,000
   - 650 KS, Automatik, 4x4, Jet Black
   - 2,500 km, Zagreb

2. **Tesla Model S Plaid 2024** - €120,000
   - 1020 KS, Automatik, 4x4, Full Self-Driving
   - 1,200 km, Split

3. **Rimac Nevera 2023** - €2,200,000
   - 1914 KS, Limited Edition 1/150
   - 850 km, Zagreb

4. **Lamborghini Revuelto 2024** - €550,000
   - 1001 KS, V12 Hybrid, Rosso Corsa
   - 800 km, Rijeka

5. **Caterpillar 320 Excavator 2022** - €85,000
   - Tracked, 150 kW, 3,200 operating hours
   - Osijek

6. **Komatsu PC200 Excavator 2021** - €72,000
   - Tracked, 135 kW, 2,800 operating hours
   - Zadar

7. **BMW M5 Competition 2023** - €95,000
   - 625 KS, Twin-turbo V8, Mineral Black
   - 3,500 km, Zagreb

8. **Mercedes-AMG GT 63 S 2023** - €165,000
   - 630 KS, Twin-turbo V8, Obsidian Black
   - 2,100 km, Split

9. **Audi RS6 Avant 2023** - €125,000
   - 592 KS, Twin-turbo V10, Daytona Gray
   - 2,800 km, Rijeka

10. **Ducati Panigale V4 2023** - €28,000
    - 214 KS, Superbike, Rosso Corsa
    - 1,200 km, Zagreb

11. **Kawasaki Ninja H2 2022** - €32,000
    - 231 KS, Supercharged, Metallic Spark Black
    - 2,100 km, Split

### Inactive Listings (5 Archived)
12. **Porsche 911 Carrera S 2020** - €95,000 (SOLD)
13. **Tesla Model 3 2021** - €55,000 (SOLD)
14. **BMW M440i 2022** - €65,000 (SOLD)
15. **Caterpillar 320 Excavator 2019** - €65,000 (SOLD)
16. **Ducati Monster 2021** - €12,000 (SOLD)

## How to Seed

### Method 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the SQL from the generated seed script
5. Run the query

### Method 2: Using JavaScript/TypeScript

```typescript
import { seedListings, generateSQLSeed } from '@/lib/seedData';
import { supabase } from '@/lib/supabase';

// Get your user ID (replace with actual user)
const userId = 'your-user-id-here';

// Generate SQL
const sql = generateSQLSeed(userId);

// Execute via Supabase client
const { error } = await supabase.rpc('exec_sql', { sql });
if (error) console.error('Seeding failed:', error);
else console.log('Seeding successful!');
```

### Method 3: Direct Insertion

```typescript
import { seedListings } from '@/lib/seedData';
import { supabase } from '@/lib/supabase';

const userId = 'your-user-id-here';

for (const listing of seedListings) {
  const { error } = await supabase
    .from('listings')
    .insert({
      owner_id: userId,
      title: listing.title,
      price: listing.price,
      currency: listing.currency,
      category_slug: listing.category_slug,
      listing_type: listing.listing_type,
      status: listing.status,
      location: listing.location,
      description: listing.description,
      contact_phone: listing.contact_phone,
      contact_email: listing.contact_email,
      attributes: listing.attributes,
    });

  if (error) console.error(`Failed to insert ${listing.title}:`, error);
}
```

## Seed Data Features

### Attributes (JSONB)
Each listing includes realistic attributes:

**Cars**:
- `marka` - Brand
- `model` - Model
- `godiste` - Year
- `kilometraza` - Mileage
- `snaga` - Power (KS)
- `mjenjac` - Transmission
- `gorivo` - Fuel type
- `pogon` - Drivetrain
- `karoserija` - Body type
- `boja` - Color

**Machinery**:
- `marka` - Brand
- `model` - Model
- `godiste` - Year
- `radni_sati` - Operating hours
- `nosivost` - Load capacity
- `vrsta_pogona` - Drive type (Gusjeničar/Kotač)
- `snaga` - Power (kW)
- `stanje` - Condition

**Motorcycles**:
- `marka` - Brand
- `model` - Model
- `godiste` - Year
- `kilometraza` - Mileage
- `snaga` - Power (KS)
- `radni_obujam` - Engine displacement (ccm)
- `tip_motora` - Engine type

### Images
All listings include professional Unsplash URLs:
- Car photography: High-quality automotive images
- Machinery: Professional construction equipment photos
- Motorcycles: Premium bike photography

### Status Distribution
- **15 Published** - Active listings visible to users
- **5 Inactive** - Archived/sold listings (shows SOLD watermark)

## Verification

After seeding, verify the data:

```sql
-- Check total listings
SELECT COUNT(*) FROM listings;

-- Check published vs inactive
SELECT status, COUNT(*) FROM listings GROUP BY status;

-- Check by category
SELECT category_slug, COUNT(*) FROM listings GROUP BY category_slug;

-- Check by listing type
SELECT listing_type, COUNT(*) FROM listings GROUP BY listing_type;

-- View specific listing
SELECT * FROM listings WHERE title LIKE '%Porsche%' LIMIT 1;
```

## Cleanup

To remove all seeded data:

```sql
-- Delete all listings (cascades to images)
DELETE FROM listings WHERE owner_id = 'your-user-id-here';
```

## Notes

- Replace `your-user-id-here` with your actual Supabase user ID
- Images are sourced from Unsplash (free, high-quality)
- All prices are in EUR (€)
- Locations are Croatian cities
- Contact info is placeholder - update as needed
- Attributes follow the database schema defined in `filters.ts`

## Troubleshooting

**Error: "Foreign key constraint failed"**
- Ensure the user exists in the `auth.users` table
- Check that `owner_id` matches a valid user

**Error: "Invalid JSON in attributes"**
- Verify JSON is properly formatted
- Check for unescaped quotes

**Images not loading**
- Verify Unsplash URLs are accessible
- Check CORS settings in Supabase Storage

## Next Steps

1. Seed the database
2. Test the listing feed
3. Verify inactive listings show SOLD watermark
4. Test filters in sidebar
5. Check image loading
