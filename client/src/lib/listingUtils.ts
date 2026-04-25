import { ListingType } from '../types';

/**
 * Get the price label based on listing type
 */
export const getPriceLabel = (listingType: ListingType): string => {
  return listingType === 'najam' ? 'Cijena po danu' : 'Cijena';
};

/**
 * Format price with appropriate label
 */
export const formatPrice = (price: number, listingType: ListingType, currency: string = '€'): string => {
  if (price === 0) return 'Na upit';
  
  const formattedPrice = price.toLocaleString('hr-HR');
  const label = getPriceLabel(listingType);
  
  return `${formattedPrice} ${currency}`;
};

/**
 * Get listing type label in Croatian
 */
export const getListingTypeLabel = (listingType: ListingType): string => {
  return listingType === 'najam' ? 'Najam' : 'Prodaja';
};

/**
 * Check if listing is for rent
 */
export const isRental = (listingType: ListingType): boolean => {
  return listingType === 'najam';
};

/**
 * Check if listing is for sale
 */
export const isForSale = (listingType: ListingType): boolean => {
  return listingType === 'prodaja';
};
