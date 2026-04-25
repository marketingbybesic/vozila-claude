// client/src/types/index.ts

export interface ListingImage {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Category {
  slug: string;
}

export type ListingStatus = 'published' | 'inactive' | 'draft';
export type ListingType = 'prodaja' | 'najam';

export interface Listing {
  id: string;
  title: string;
  price: number;
  currency?: string;
  year?: number;
  mileage?: number;
  status: ListingStatus;
  listing_type: ListingType;
  is_featured?: boolean;
  attributes: Record<string, any>; // JSONB object
  listing_images: ListingImage[];
  categories: Category;
  views_count?: number;
  description?: string;
  location?: string;
  contact_phone?: string;
  contact_email?: string;
  owner_id?: string;
  category_slug?: string;
  created_at?: string;
  updated_at?: string;
}