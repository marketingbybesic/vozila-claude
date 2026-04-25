import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dot } from 'lucide-react';
import { Listing } from '../../types';

interface ListingCardProps {
  listing: Listing;
  isLoading?: boolean;
}

export const ListingCard = ({ listing, isLoading = false }: ListingCardProps) => {
  const [showSecondImage, setShowSecondImage] = useState(false);

  const images = listing.listing_images || [];
  const sortedImages = images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const hasMultipleImages = sortedImages.length > 1;
  const primaryImage = sortedImages[0]?.url;
  const secondaryImage = sortedImages[1]?.url;
  const showHotBadge = listing.views_count > 20;

  // Skeleton Loader
  if (isLoading) {
    return (
      <div className="group bg-card border border-border/40 rounded-none overflow-hidden">
        {/* Image Skeleton */}
        <div className="relative aspect-[16/9] bg-gradient-to-r from-neutral-800 to-neutral-900 animate-pulse" />

        {/* Content Skeleton */}
        <div className="p-6 space-y-4">
          <div className="h-4 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-none animate-pulse w-3/4" />
          <div className="h-4 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-none animate-pulse w-1/2" />
          <div className="h-6 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-none animate-pulse w-24" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group bg-card border border-border/40 rounded-none overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-primary/50"
      onMouseEnter={() => setShowSecondImage(true)}
      onMouseLeave={() => setShowSecondImage(false)}
    >
      {/* Image Container - 16:9 Aspect Ratio */}
      <div className="relative aspect-[16/9] bg-neutral-900 overflow-hidden">
        {/* Multiple Images with Hover Slide */}
        {hasMultipleImages && primaryImage && secondaryImage ? (
          <div className="relative w-full h-full">
            {/* Primary Image */}
            <motion.img
              src={primaryImage}
              alt={`${listing.title} - Image 1`}
              className="absolute inset-0 w-full h-full object-cover"
              animate={{ x: showSecondImage ? '-100%' : '0%' }}
              transition={{
                duration: 0.7,
                ease: [0.25, 0.46, 0.45, 0.94], // cubic-bezier
              }}
            />
            
            {/* Secondary Image */}
            <motion.img
              src={secondaryImage}
              alt={`${listing.title} - Image 2`}
              className="absolute inset-0 w-full h-full object-cover"
              animate={{ x: showSecondImage ? '0%' : '100%' }}
              transition={{
                duration: 0.7,
                ease: [0.25, 0.46, 0.45, 0.94], // cubic-bezier
              }}
            />
          </div>
        ) : primaryImage ? (
          // Single Image
          <img
            src={primaryImage}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          // Fallback: Vozila.hr Logo
          <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-black text-white/20 mb-2">V</div>
              <p className="text-xs font-black uppercase tracking-widest text-white/10">
                Vozila.hr
              </p>
            </div>
          </div>
        )}

        {/* Hot Item Badge */}
        {showHotBadge && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded-none">
            <Dot className="w-3 h-3 fill-current" />
            <span className="text-xs font-black uppercase tracking-widest">34 pogleda danas</span>
          </div>
        )}

        {/* Image Counter (Multi-image) */}
        {hasMultipleImages && (
          <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-none text-white text-xs font-black uppercase tracking-widest">
            {showSecondImage ? '2' : '1'} / {sortedImages.length}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-3">
        {/* Title */}
        <h3 className="text-sm font-black text-white leading-tight tracking-tight line-clamp-2">
          {listing.title}
        </h3>

        {/* Attributes (Year, Mileage, etc.) */}
        {listing.attributes && (
          <div className="flex flex-wrap gap-2">
            {listing.attributes.year && (
              <span className="text-xs font-medium text-neutral-400">
                {listing.attributes.year}
              </span>
            )}
            {listing.attributes.mileage && (
              <span className="text-xs font-medium text-neutral-400">
                {listing.attributes.mileage.toLocaleString()} km
              </span>
            )}
            {listing.attributes.fuelType && (
              <span className="text-xs font-medium text-neutral-400">
                {listing.attributes.fuelType}
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="pt-2 border-t border-border/40">
          <p className="text-lg font-black text-white">
            {listing.price === 0 ? (
              <span className="italic text-primary">Na upit</span>
            ) : (
              `${listing.price.toLocaleString()} €`
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
