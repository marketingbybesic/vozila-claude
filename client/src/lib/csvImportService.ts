import { supabase } from './supabase';

interface CSVRow {
  [key: string]: string;
}

interface ImportResult {
  success: boolean;
  listingsCreated: number;
  listingsFailed: number;
  errors: Array<{ row: number; error: string }>;
  totalProcessed: number;
}

interface ColumnMapping {
  [csvColumn: string]: string; // Maps CSV column to listing field
}

/**
 * Parse CSV file and return rows
 */
export const parseCSV = (file: File): Promise<CSVRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('CSV must contain header and at least one data row'));
          return;
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Parse rows
        const rows: CSVRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: CSVRow = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          rows.push(row);
        }

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * Auto-detect column mapping from CSV headers
 */
export const detectColumnMapping = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {};

  const fieldMappings: Record<string, string[]> = {
    'title': ['naziv', 'naslov', 'model', 'vozilo'],
    'price': ['cijena', 'cena', 'price', 'vrijednost'],
    'location': ['lokacija', 'mjesto', 'grad', 'location'],
    'contact_phone': ['telefon', 'phone', 'broj'],
    'contact_email': ['email', 'e-mail', 'pošta'],
    'description': ['opis', 'description', 'napomena'],
    'image_urls': ['slike', 'images', 'foto', 'fotografije'],
    'year': ['godište', 'godina', 'god', 'year'],
    'mileage': ['kilometraža', 'km', 'mileage'],
    'brand': ['marka', 'brand', 'proizvodač'],
    'model': ['model', 'tip'],
    'fuel_type': ['gorivo', 'fuel', 'tip_goriva'],
    'transmission': ['mjenjač', 'transmission', 'prijenosnik'],
    'power': ['snaga', 'ks', 'power', 'hp'],
  };

  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    
    for (const [field, aliases] of Object.entries(fieldMappings)) {
      if (aliases.some(alias => lowerHeader.includes(alias))) {
        mapping[header] = field;
        break;
      }
    }
  });

  return mapping;
};

/**
 * Process image URLs and upload to Supabase
 */
export const processImages = async (
  imageUrls: string[],
  listingId: string,
  userId: string
): Promise<string[]> => {
  const uploadedUrls: string[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const imageUrl = imageUrls[i].trim();
      if (!imageUrl) continue;

      // Fetch image from external URL
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

      const blob = await response.blob();
      const filename = `${listingId}_${i}_${Date.now()}.webp`;
      const path = `${userId}/${listingId}/gallery/${filename}`;

      // Upload to Supabase
      const { error } = await supabase.storage
        .from('listings')
        .upload(path, blob, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('listings')
        .getPublicUrl(path);

      if (publicData?.publicUrl) {
        uploadedUrls.push(publicData.publicUrl);
      }
    } catch (error) {
      console.error(`Failed to process image ${i}:`, error);
      // Continue with other images
    }
  }

  return uploadedUrls;
};

/**
 * Build attributes object based on category
 */
export const buildAttributes = (
  row: CSVRow,
  mapping: ColumnMapping
): Record<string, any> => {
  const attributes: Record<string, any> = {};

  // Map CSV columns to attributes
  Object.entries(mapping).forEach(([csvColumn, field]) => {
    const value = row[csvColumn];
    
    if (!value) return;

    // Type conversion based on field
    switch (field) {
      case 'year':
      case 'mileage':
      case 'power':
        attributes[field] = parseInt(value, 10);
        break;
      case 'price':
        attributes[field] = parseFloat(value);
        break;
      default:
        attributes[field] = value;
    }
  });

  return attributes;
};

/**
 * Import CSV listings into database
 */
export const importListingsFromCSV = async (
  file: File,
  categorySlug: string,
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: true,
    listingsCreated: 0,
    listingsFailed: 0,
    errors: [],
    totalProcessed: 0,
  };

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Parse CSV
    const rows = await parseCSV(file);
    const headers = Object.keys(rows[0] || {});
    const columnMapping = detectColumnMapping(headers);

    result.totalProcessed = rows.length;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        onProgress?.(i + 1, rows.length);

        // Extract fields
        const title = row[Object.keys(columnMapping).find(k => columnMapping[k] === 'title') || ''] || 'Untitled';
        const price = parseInt(row[Object.keys(columnMapping).find(k => columnMapping[k] === 'price') || ''] || '0');
        const location = row[Object.keys(columnMapping).find(k => columnMapping[k] === 'location') || ''];
        const contactPhone = row[Object.keys(columnMapping).find(k => columnMapping[k] === 'contact_phone') || ''];
        const contactEmail = row[Object.keys(columnMapping).find(k => columnMapping[k] === 'contact_email') || ''];
        const description = row[Object.keys(columnMapping).find(k => columnMapping[k] === 'description') || ''];
        const imageUrlsStr = row[Object.keys(columnMapping).find(k => columnMapping[k] === 'image_urls') || ''];

        // Build attributes
        const attributes = buildAttributes(row, columnMapping);

        // Create listing
        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .insert({
            owner_id: user.id,
            category_slug: categorySlug,
            title,
            price,
            location,
            contact_phone: contactPhone,
            contact_email: contactEmail,
            description,
            attributes,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (listingError) throw listingError;
        if (!listing) throw new Error('Failed to create listing');

        // Process images if provided
        if (imageUrlsStr) {
          const imageUrls = imageUrlsStr.split(';').filter(url => url.trim());
          const uploadedUrls = await processImages(imageUrls, listing.id, user.id);

          // Insert image records
          if (uploadedUrls.length > 0) {
            const imageRecords = uploadedUrls.map((url, idx) => ({
              listing_id: listing.id,
              url,
              is_primary: idx === 0,
              sort_order: idx,
            }));

            const { error: imageError } = await supabase
              .from('listing_images')
              .insert(imageRecords);

            if (imageError) {
              console.error('Failed to insert image records:', imageError);
            }
          }
        }

        result.listingsCreated++;
      } catch (error) {
        result.listingsFailed++;
        result.errors.push({
          row: i + 2, // +2 for header + 1-based indexing
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push({
      row: 0,
      error: error instanceof Error ? error.message : 'Import failed',
    });
    return result;
  }
};

/**
 * Validate CSV before import
 */
export const validateCSV = (file: File): Promise<{ valid: boolean; errors: string[] }> => {
  return new Promise((resolve) => {
    const errors: string[] = [];

    // Check file type
    if (!file.name.endsWith('.csv')) {
      errors.push('File must be a CSV file');
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('File size must not exceed 10MB');
    }

    resolve({
      valid: errors.length === 0,
      errors,
    });
  });
};

/**
 * CSV Template generator
 */
export const generateCSVTemplate = (): string => {
  const headers = [
    'Naziv',
    'Marka',
    'Model',
    'Godište',
    'Kilometraža',
    'Gorivo',
    'Mjenjač',
    'Snaga (KS)',
    'Cijena',
    'Lokacija',
    'Telefon',
    'Email',
    'Opis',
    'Slike (URL1;URL2;URL3)',
  ];

  const exampleRow = [
    'BMW 320d',
    'BMW',
    '3 Series',
    '2020',
    '45000',
    'Diesel',
    'Automatik',
    '190',
    '25000',
    'Zagreb',
    '+385 1 234 5678',
    'dealer@example.com',
    'Odličan automobil u odličnom stanju',
    'https://example.com/image1.jpg;https://example.com/image2.jpg',
  ];

  return [headers, exampleRow].map(row => row.join(',')).join('\n');
};
