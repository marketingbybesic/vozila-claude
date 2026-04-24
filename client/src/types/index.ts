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

export interface Listing {
  id: string;
  title: string;
  price: number;
  currency?: string;
  year?: number;
  mileage?: number;
  attributes: any; 
  listing_images: ListingImage[];
  categories: Category;
  featured: boolean;
  views_count: number;
}