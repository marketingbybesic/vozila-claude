import { Home, Repeat2 } from 'lucide-react';

interface RentalToggleProps {
  value: 'prodaja' | 'najam';
  onChange: (value: 'prodaja' | 'najam') => void;
}

export const RentalToggle = ({ value, onChange }: RentalToggleProps) => {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-black uppercase tracking-widest text-white/60">
        Tip oglasa
      </label>

      {/* Toggle Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Sale Button */}
        <button
          onClick={() => onChange('prodaja')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-none font-black uppercase tracking-widest text-xs transition-all ${
            value === 'prodaja'
              ? 'bg-white text-black border border-white'
              : 'bg-black border border-white/20 text-white/60 hover:border-white/40'
          }`}
        >
          <Home className="w-4 h-4" strokeWidth={2} />
          Prodaja
        </button>

        {/* Rental Button */}
        <button
          onClick={() => onChange('najam')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-none font-black uppercase tracking-widest text-xs transition-all ${
            value === 'najam'
              ? 'bg-white text-black border border-white'
              : 'bg-black border border-white/20 text-white/60 hover:border-white/40'
          }`}
        >
          <Repeat2 className="w-4 h-4" strokeWidth={2} />
          Najam
        </button>
      </div>

      {/* Price Label Info */}
      <div className="p-3 border border-white/10 bg-white/5 rounded-none">
        <p className="text-xs text-neutral-400">
          <span className="font-black text-white">
            {value === 'prodaja' ? 'Cijena' : 'Cijena po danu'}
          </span>
          {value === 'najam' && (
            <span className="text-neutral-500 ml-1">(npr. 50€/dan)</span>
          )}
        </p>
      </div>
    </div>
  );
};
