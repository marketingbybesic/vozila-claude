import { Link } from 'react-router-dom';
import { MapPin, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface NativeAdCardProps {
  id: string;
  title: string;
  price: number;
  currency?: string;
  location?: string;
  imageUrl?: string;
  year?: number;
  mileage?: number;
  priceStatus?: 'great' | 'market' | 'high' | 'inquiry';
}

export const NativeAdCard = ({
  id,
  title,
  price,
  currency = '€',
  location,
  imageUrl,
  year,
  mileage,
  priceStatus = 'market',
}: NativeAdCardProps) => {
  const priceRibbon = {
    inquiry: { icon: Minus, text: 'Cijena na upit', color: 'bg-slate-500' },
    great: { icon: TrendingDown, text: 'Odlična cijena', color: 'bg-green-500' },
    market: { icon: Minus, text: 'Tržišna cijena', color: 'bg-yellow-500' },
    high: { icon: TrendingUp, text: 'Iznad prosjeka', color: 'bg-orange-500' },
  }[priceStatus];

  const RibbonIcon = priceRibbon.icon;

  return (
    <Link
      to={`/listing/${id}`}
      className="group relative block bg-neutral-900 border border-white/10 rounded-none overflow-hidden hover:border-white/30 transition-all duration-300"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] bg-neutral-800 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
            <span className="text-neutral-600 text-xs font-black uppercase tracking-widest">
              Nema slike
            </span>
          </div>
        )}

        {/* Price Ribbon */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 ${priceRibbon.color} text-white rounded-none`}>
          <RibbonIcon className="w-3 h-3" strokeWidth={2} />
          <span className="text-xs font-black uppercase tracking-widest">{priceRibbon.text}</span>
        </div>

        {/* SPONZORIRANO Tag - Tiny, Elegant */}
        <div className="absolute top-3 left-3 px-1.5 py-0.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-none">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
            Sponzorirano
          </span>
        </div>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="text-sm font-black text-white line-clamp-2 group-hover:text-neutral-200 transition-colors">
          {title}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black text-white">
            {price === 0 ? 'Na upit' : `${price.toLocaleString()} ${currency}`}
          </span>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          {year && <span>{year}</span>}
          {mileage && <span>{mileage.toLocaleString()} km</span>}
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <MapPin className="w-3 h-3" strokeWidth={1.5} />
            <span>{location}</span>
          </div>
        )}
      </div>
    </Link>
  );
};
