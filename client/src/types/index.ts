// client/src/types/index.ts

export interface ListingImage {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Category {
  slug: string;
  name?: string;
  name_en?: string;
  name_hr?: string;
}

export type ListingStatus = 'draft' | 'active' | 'sold';
export type ListingType = 'prodaja' | 'najam';
export type UserType = 'private' | 'business';

export type SubTier = 'bronze' | 'silver' | 'gold';
export type SubStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface Profile {
  id: string;
  email: string;
  role: 'user' | 'dealer' | 'admin' | 'moderator' | 'inspector' | 'owner';
  user_type: UserType;
  whatsapp_number?: string;
  vat_id?: string;
  company_name?: string;
  office_address?: string;
  business_phone?: string;
  dealer_verified: boolean;
  is_verified?: boolean;
  tier?: 'free' | 'premium' | 'partner';
  subscription_tier?: SubTier | null;
  subscription_status?: SubStatus | null;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

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
  owner?: Profile;
  category_slug?: string;
  damage_images?: string[];
  created_at?: string;
  updated_at?: string;
}