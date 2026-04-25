/**
 * Supabase Seed Data - Premium Listings
 * Run this in Supabase SQL Editor or use with a seed script
 */

export const seedListings = [
  // PORSCHE 911 TURBO S
  {
    title: 'Porsche 911 Turbo S 2023',
    price: 185000,
    currency: 'EUR',
    category_slug: 'osobni-automobili',
    listing_type: 'prodaja',
    status: 'published',
    location: 'Zagreb',
    description: 'Izuzetna Porsche 911 Turbo S iz 2023. godine sa svim opcijama. Vozilo je u perfektnom stanju, redovito održavano kod ovlaštenog servisa. Samo 2,500 km. Sve originalne knjige i dokumentacija dostupna.',
    contact_phone: '+385 1 234 5678',
    contact_email: 'dealer@vozila.hr',
    attributes: {
      marka: 'Porsche',
      model: '911 Turbo S',
      godiste: 2023,
      kilometraza: 2500,
      snaga: '650 KS',
      mjenjac: 'Automatik',
      gorivo: 'Benzin',
      pogon: '4x4',
      karoserija: 'Coupe',
      boja: 'Jet Black',
      vlasnici: 1,
      servisna_knjiga: true,
    },
    images: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
    ],
  },

  // TESLA MODEL S PLAID
  {
    title: 'Tesla Model S Plaid 2024',
    price: 120000,
    currency: 'EUR',
    category_slug: 'osobni-automobili',
    listing_type: 'prodaja',
    status: 'published',
    location: 'Split',
    description: 'Najnovija Tesla Model S Plaid sa tri motora. Nevjerojatne performanse - 0-100 km/h u 2.1 sekundi. Autopilot, Full Self-Driving paket, panoramski krov. Kao nova, samo 1,200 km.',
    contact_phone: '+385 21 123 456',
    contact_email: 'tesla@vozila.hr',
    attributes: {
      marka: 'Tesla',
      model: 'Model S Plaid',
      godiste: 2024,
      kilometraza: 1200,
      snaga: '1020 KS',
      mjenjac: 'Automatik',
      gorivo: 'Struja',
      pogon: '4x4',
      karoserija: 'Limuzina',
      baterija: '100 kWh',
      domet: '628 km',
      autopilot: true,
    },
    images: [
      'https://images.unsplash.com/photo-1560958089-b8a46dd52d12?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1617654112368-307921291f42?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560958089-fbf3ee9f5f05?w=800&h=600&fit=crop',
    ],
  },

  // RIMAC NEVERA
  {
    title: 'Rimac Nevera 2023',
    price: 2200000,
    currency: 'EUR',
    category_slug: 'osobni-automobili',
    listing_type: 'prodaja',
    status: 'published',
    location: 'Zagreb',
    description: 'Rimac Nevera - najbrži električni automobil na svijetu. Samo 150 primjeraka proizvedeno. 0-100 km/h u 1.85 sekundi. Apsolutna raritet i investicija. Sve originalne dokumentacije i certifikati dostupni.',
    contact_phone: '+385 1 999 9999',
    contact_email: 'rimac@vozila.hr',
    attributes: {
      marka: 'Rimac',
      model: 'Nevera',
      godiste: 2023,
      kilometraza: 850,
      snaga: '1914 KS',
      mjenjac: 'Automatik',
      gorivo: 'Struja',
      pogon: '4x4',
      karoserija: 'Coupe',
      baterija: '120 kWh',
      domet: '550 km',
      proizvodnja: 'Limited Edition 1/150',
    },
    images: [
      'https://images.unsplash.com/photo-1567818735868-e71b99932e29?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1567818735933-f9d5c6e6b5d0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1567818735900-e71b99932e29?w=800&h=600&fit=crop',
    ],
  },

  // LAMBORGHINI REVUELTO
  {
    title: 'Lamborghini Revuelto 2024',
    price: 550000,
    currency: 'EUR',
    category_slug: 'osobni-automobili',
    listing_type: 'prodaja',
    status: 'published',
    location: 'Rijeka',
    description: 'Lamborghini Revuelto - prvi hibridni super-auto od Lamborghinija. V12 motor sa električnom potporom. Ekstremne performanse i luksuz. Kao nova, samo 800 km.',
    contact_phone: '+385 51 234 567',
    contact_email: 'lambo@vozila.hr',
    attributes: {
      marka: 'Lamborghini',
      model: 'Revuelto',
      godiste: 2024,
      kilometraza: 800,
      snaga: '1001 KS',
      mjenjac: 'Automatik',
      gorivo: 'Hibrid',
      pogon: '4x4',
      karoserija: 'Coupe',
      boja: 'Rosso Corsa',
      vlasnici: 1,
    },
    images: [
      'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
    ],
  },

  // CATERPILLAR EXCAVATOR
  {
    title: 'Caterpillar 320 Excavator 2022',
    price: 85000,
    currency: 'EUR',
    category_slug: 'strojevi',
    listing_type: 'prodaja',
    status: 'published',
    location: 'Osijek',
    description: 'Profesionalni Caterpillar 320 bageri iz 2022. godine. Odličan radni stroj sa punom servisnom knjigom. Redovito održavan, spreman za rad. Idealan za građevinske projekte.',
    contact_phone: '+385 31 234 567',
    contact_email: 'machinery@vozila.hr',
    attributes: {
      marka: 'Caterpillar',
      model: '320',
      godiste: 2022,
      radni_sati: 3200,
      nosivost: 20000,
      vrsta_pogona: 'Gusjeničar',
      snaga: '150 kW',
      stanje: 'Rabljeno',
      servisna_knjiga: true,
    },
    images: [
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1581092162562-40038f56386f?w=800&h=600&fit=crop',
    ],
  },

  // KOMATSU EXCAVATOR
  {
    title: 'Komatsu PC200 Excavator 2021',
    price: 72000,
    currency: 'EUR',
    category_slug: 'strojevi',
    listing_type: 'prodaja',
    status: 'published',
    location: 'Zadar',
    description: 'Komatsu PC200 bageri sa odličnim radnim satima. Kompaktan i efikasan stroj. Savršen za srednje građevinske radove. Sve originalne dijelove i dokumentaciju.',
    contact_phone: '+385 23 234 567',
    contact_email: 'machinery@vozila.hr',
    attributes: {
      marka: 'Komatsu',
      model: 'PC200',
      godiste: 2021,
      radni_sati: 2800,
      nosivost: 18000,
      vrsta_pogona: 'Gusjeničar',
      snaga: '135 kW',
      stanje: 'Rabljeno',
    },
    images: [
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1581092162562-40038f56386f?w=800&h=600&fit=crop',
    ],
  },

  // BMW M5 COMPETITION
  {
    title: 'BMW M5 Competition 2023',
    price: 95000,
    currency: 'EUR',
    category_slug: 'osobni-automobili',
    listing_type: 'prodaja',
    status: 'published',
    location: 'Zagreb',
    description: 'BMW M5 Competition - ultimate driving machine. Twin-turbo V8 sa 625 KS. Adaptivni M suspension, M carbon ceramic kočnice. Kao nova, samo 3,500 km.',
    contact_phone: '+385 1 234 5678',
    contact_email: 'bmw@vozila.hr',
    attributes: {
      marka: 'BMW',
      model: 'M5 Competition',
      godiste: 2023,
      kilometraza: 3500,
      snaga: '625 KS',
      mjenjac: 'Automatik',
      gorivo: 'Benzin',
      pogon: '4x4',
      karoserija: 'Limuzina',
      boja: 'Mineral Black',
    },
    images: [
      'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
    ],
  },

  // MERCEDES-AMG GT
  {
    title: 'Mercedes-AMG GT 63 S 2023',
    price: 165000,
    currency: 'EUR',
    category_slug: 'osobni-automobili',
    listing_type: 'prodaja',
    status: 'published',
    location: 'Split',
    description: 'Mercedes-AMG GT 63 S - elegancija i moć. Twin-turbo V8 sa 630 KS. Dinamički, luksuzni, savršen. Sve AMG pakete, kao nova.',
    contact_phone: '+385 21 123 456',
    contact_email: 'mercedes@vozila.hr',
    attributes: {
      marka: 'Mercedes-Benz',
      model: 'AMG GT 63 S',
      godiste: 2023,
      kilometraza: 2100,
      snaga: '630 KS',
      mjenjac: 'Automatik',
      gorivo: 'Benzin',
      pogon: '4x4',
      karoserija: 'Coupe',
      boja: 'Obsidian Black',
    },
    images: [
      'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
    ],
  },

  // AUDI RS6 AVANT
  {
    title: 'Audi RS6 Avant 2023',
    price: 125000,
    currency: 'EUR',
    category_slug: 'osobni-automobili',
    listing_type: 'prodaja',
    status: 'published',
    location: 'Rijeka',
    description: 'Audi RS6 Avant - praktičnost sa super-auto performansama. Twin-turbo V10 sa 592 KS. Karavan sa stilom i snagom. Kao nova.',
    contact_phone: '+385 51 234 567',
    contact_email: 'audi@vozila.hr',
    attributes: {
      marka: 'Audi',
      model: 'RS6 Avant',
      godiste: 2023,
      kilometraza: 2800,
      snaga: '592 KS',
      mjenjac: 'Automatik',
      gorivo: 'Benzin',
      pogon: '4x4',
      karoserija: 'Karavan',
      boja: 'Daytona Gray',
    },
    images: [
      'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
    ],
  },

  // DUCATI PANIGALE V4
  {
    title: 'Ducati Panigale V4 2023',
    price: 28000,
    currency: 'EUR',
    category_slug: 'motocikli',
    listing_type: 'prodaja',
    status: 'published',
    location: 'Zagreb',
    description: 'Ducati Panigale V4 - superbajk sa 214 KS. Najnoviji model sa svim elektronikom. Kao nova, samo 1,200 km. Idealna za adrenalin.',
    contact_phone: '+385 1 234 5678',
    contact_email: 'ducati@vozila.hr',
    attributes: {
      marka: 'Ducati',
      model: 'Panigale V4',
      godiste: 2023,
      kilometraza: 1200,
      snaga: '214 KS',
      radni_obujam: 1103,
      tip_motora: '4-taktni',
      boja: 'Rosso Corsa',
    },
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    ],
  },

  // KAWASAKI NINJA H2
  {
    title: 'Kawasaki Ninja H2 2022',
    price: 32000,
    currency: 'EUR',
    category_slug: 'motocikli',
    listing_type: 'prodaja',
    status: 'published',
    location: 'Split',
    description: 'Kawasaki Ninja H2 - superbajk sa superchargerom. 231 KS čiste moći. Nevjerojatna ubrzanja i dinamika. Kao nova, samo 2,100 km.',
    contact_phone: '+385 21 123 456',
    contact_email: 'kawasaki@vozila.hr',
    attributes: {
      marka: 'Kawasaki',
      model: 'Ninja H2',
      godiste: 2022,
      kilometraza: 2100,
      snaga: '231 KS',
      radni_obujam: 998,
      tip_motora: '4-taktni',
      boja: 'Metallic Spark Black',
    },
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    ],
  },

  // INACTIVE LISTINGS (5 total)
  {
    title: 'Porsche 911 Carrera S 2020 - SOLD',
    price: 95000,
    currency: 'EUR',
    category_slug: 'osobni-automobili',
    listing_type: 'prodaja',
    status: 'inactive',
    location: 'Zagreb',
    description: 'Porsche 911 Carrera S - Prodano. Oglas je arhiviran.',
    contact_phone: '+385 1 234 5678',
    contact_email: 'dealer@vozila.hr',
    attributes: {
      marka: 'Porsche',
      model: '911 Carrera S',
      godiste: 2020,
      kilometraza: 45000,
      snaga: '450 KS',
      mjenjac: 'Automatik',
      gorivo: 'Benzin',
    },
    images: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
    ],
  },

  {
    title: 'Tesla Model 3 2021 - SOLD',
    price: 55000,
    currency: 'EUR',
    category_slug: 'osobni-automobili',
    listing_type: 'prodaja',
    status: 'inactive',
    location: 'Split',
    description: 'Tesla Model 3 - Prodano. Oglas je arhiviran.',
    contact_phone: '+385 21 123 456',
    contact_email: 'tesla@vozila.hr',
    attributes: {
      marka: 'Tesla',
      model: 'Model 3',
      godiste: 2021,
      kilometraza: 35000,
      snaga: '450 KS',
      gorivo: 'Struja',
    },
    images: [
      'https://images.unsplash.com/photo-1560958089-b8a46dd52d12?w=800&h=600&fit=crop',
    ],
  },

  {
    title: 'BMW M440i 2022 - SOLD',
    price: 65000,
    currency: 'EUR',
    category_slug: 'osobni-automobili',
    listing_type: 'prodaja',
    status: 'inactive',
    location: 'Rijeka',
    description: 'BMW M440i - Prodano. Oglas je arhiviran.',
    contact_phone: '+385 51 234 567',
    contact_email: 'bmw@vozila.hr',
    attributes: {
      marka: 'BMW',
      model: 'M440i',
      godiste: 2022,
      kilometraza: 28000,
      snaga: '382 KS',
      gorivo: 'Benzin',
    },
    images: [
      'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=800&h=600&fit=crop',
    ],
  },

  {
    title: 'Caterpillar 320 Excavator 2019 - SOLD',
    price: 65000,
    currency: 'EUR',
    category_slug: 'strojevi',
    listing_type: 'prodaja',
    status: 'inactive',
    location: 'Osijek',
    description: 'Caterpillar 320 - Prodano. Oglas je arhiviran.',
    contact_phone: '+385 31 234 567',
    contact_email: 'machinery@vozila.hr',
    attributes: {
      marka: 'Caterpillar',
      model: '320',
      godiste: 2019,
      radni_sati: 5200,
      nosivost: 20000,
      vrsta_pogona: 'Gusjeničar',
    },
    images: [
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop',
    ],
  },

  {
    title: 'Ducati Monster 2021 - SOLD',
    price: 12000,
    currency: 'EUR',
    category_slug: 'motocikli',
    listing_type: 'prodaja',
    status: 'inactive',
    location: 'Zagreb',
    description: 'Ducati Monster - Prodano. Oglas je arhiviran.',
    contact_phone: '+385 1 234 5678',
    contact_email: 'ducati@vozila.hr',
    attributes: {
      marka: 'Ducati',
      model: 'Monster',
      godiste: 2021,
      kilometraza: 8500,
      snaga: '111 KS',
      radni_obujam: 937,
    },
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    ],
  },
];

export const generateSQLSeed = (userId: string) => {
  return seedListings
    .map((listing) => {
      const attributesJson = JSON.stringify(listing.attributes).replace(/"/g, '\\"');

      return `
INSERT INTO listings (
  owner_id,
  title,
  price,
  currency,
  category_slug,
  listing_type,
  status,
  location,
  description,
  contact_phone,
  contact_email,
  attributes,
  created_at,
  updated_at
) VALUES (
  '${userId}',
  '${listing.title.replace(/'/g, "''")}',
  ${listing.price},
  '${listing.currency}',
  '${listing.category_slug}',
  '${listing.listing_type}',
  '${listing.status}',
  '${listing.location}',
  '${listing.description.replace(/'/g, "''")}',
  '${listing.contact_phone}',
  '${listing.contact_email}',
  '${attributesJson}',
  NOW(),
  NOW()
);
`;
    })
    .join('\n');
};

export const generateListingImagesSQL = (userId: string) => {
  return seedListings
    .flatMap((listing, listingIndex) =>
      listing.images.map((imageUrl, imageIndex) => {
        return `
INSERT INTO listing_images (
  listing_id,
  url,
  is_primary,
  sort_order,
  created_at
) VALUES (
  (SELECT id FROM listings WHERE owner_id = '${userId}' ORDER BY created_at LIMIT 1 OFFSET ${listingIndex}),
  '${imageUrl}',
  ${imageIndex === 0 ? 'true' : 'false'},
  ${imageIndex},
  NOW()
);
`;
      })
    )
    .join('\n');
};
