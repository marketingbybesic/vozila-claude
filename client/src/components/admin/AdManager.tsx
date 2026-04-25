import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Save, X, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdSlot {
  id: string;
  image_url?: string;
  target_link: string;
  ad_type: 'image' | 'video' | 'html';
  is_dealership: boolean;
  created_at: string;
  updated_at: string;
}

interface EditingAd {
  id: string;
  image_url: string;
  target_link: string;
}

export const AdManager = () => {
  const [ads, setAds] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAd, setEditingAd] = useState<EditingAd | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch ads on mount
  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAds(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ads');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (ad: AdSlot) => {
    setEditingAd({
      id: ad.id,
      image_url: ad.image_url || '',
      target_link: ad.target_link,
    });
  };

  const handleSaveAd = async () => {
    if (!editingAd) return;

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('ads')
        .update({
          image_url: editingAd.image_url,
          target_link: editingAd.target_link,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingAd.id);

      if (updateError) throw updateError;

      // Update local state
      setAds(ads.map(ad => 
        ad.id === editingAd.id 
          ? { ...ad, image_url: editingAd.image_url, target_link: editingAd.target_link }
          : ad
      ));

      setEditingAd(null);
      setSuccessMessage('Oglas je uspješno ažuriran');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ad');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Jeste li sigurni da želite obrisati ovaj oglas?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('ads')
        .delete()
        .eq('id', adId);

      if (deleteError) throw deleteError;

      setAds(ads.filter(ad => ad.id !== adId));
      setSuccessMessage('Oglas je obrisan');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ad');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white mb-2">Upravljanje oglasima</h1>
        <p className="text-xs text-neutral-400 uppercase tracking-widest">
          Upravljajte aktivnim oglasima u mreži
        </p>
      </div>

      {/* Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 border border-red-500/30 bg-red-500/5 rounded-none flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-sm text-red-300">{error}</p>
        </motion.div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 border border-green-500/30 bg-green-500/5 rounded-none flex items-start gap-3"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
          <p className="text-sm text-green-300">{successMessage}</p>
        </motion.div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 border border-white/10 bg-white/5 rounded-none">
              <div className="h-4 bg-gradient-to-r from-neutral-800 to-neutral-900 animate-pulse rounded-none w-3/4 mb-4" />
              <div className="h-3 bg-gradient-to-r from-neutral-800 to-neutral-900 animate-pulse rounded-none w-1/2 mb-2" />
              <div className="h-3 bg-gradient-to-r from-neutral-800 to-neutral-900 animate-pulse rounded-none w-1/3" />
            </div>
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="p-8 border border-white/10 bg-white/5 rounded-none text-center">
          <p className="text-sm text-neutral-400">Nema aktivnih oglasa</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ads.map((ad) => (
            <motion.div
              key={ad.id}
              layout
              className="border border-white/10 rounded-none overflow-hidden hover:border-white/30 transition-all duration-300"
            >
              {/* Ad Preview */}
              <div className="relative aspect-[16/9] bg-neutral-900 overflow-hidden group">
                {ad.image_url ? (
                  <img
                    src={ad.image_url}
                    alt="Ad preview"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                    <span className="text-neutral-600 text-xs font-black uppercase tracking-widest">
                      Nema slike
                    </span>
                  </div>
                )}

                {/* Edit Button Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleEditClick(ad)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all"
                  >
                    <Edit2 className="w-4 h-4" strokeWidth={2} />
                    Uredi
                  </button>
                </div>

                {/* Dealership Badge */}
                {ad.is_dealership && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-blue-500/20 border border-blue-500/40 rounded-none">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                      Dealer
                    </span>
                  </div>
                )}
              </div>

              {/* Ad Info */}
              <div className="p-4 space-y-3">
                {/* Type */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-1">
                    Tip
                  </p>
                  <p className="text-sm text-white capitalize">{ad.ad_type}</p>
                </div>

                {/* Link */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-1">
                    Link
                  </p>
                  <p className="text-xs text-white/80 break-all font-mono">{ad.target_link}</p>
                </div>

                {/* Created Date */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-1">
                    Kreirano
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(ad.created_at).toLocaleDateString('hr-HR')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-white/10">
                  <button
                    onClick={() => handleEditClick(ad)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all"
                  >
                    <Edit2 className="w-4 h-4" strokeWidth={2} />
                    Uredi
                  </button>
                  <button
                    onClick={() => handleDeleteAd(ad.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-none font-black uppercase tracking-widest text-xs hover:bg-red-500/30 transition-all"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2} />
                    Obriši
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingAd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-black border border-white/10 rounded-none p-8 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Uredi oglas</h2>
                  <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
                    Ažuriraj sliku i link
                  </p>
                </div>
                <button
                  onClick={() => setEditingAd(null)}
                  className="p-2 hover:bg-white/10 rounded-none transition-all"
                >
                  <X className="w-5 h-5 text-white" strokeWidth={2} />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Image URL */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                    URL slike
                  </label>
                  <input
                    type="text"
                    value={editingAd.image_url}
                    onChange={(e) =>
                      setEditingAd({ ...editingAd, image_url: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
                  />
                </div>

                {/* Target Link */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                    Odredišni link
                  </label>
                  <input
                    type="text"
                    value={editingAd.target_link}
                    onChange={(e) =>
                      setEditingAd({ ...editingAd, target_link: e.target.value })
                    }
                    placeholder="https://example.com"
                    className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
                  />
                </div>

                {/* Image Preview */}
                {editingAd.image_url && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                      Pregled
                    </label>
                    <img
                      src={editingAd.image_url}
                      alt="Preview"
                      className="w-full aspect-[16/9] object-cover border border-white/10 rounded-none"
                      onError={() => setError('Slika se ne može učitati')}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => setEditingAd(null)}
                  className="flex-1 px-6 py-3 bg-neutral-900 border border-white/10 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleSaveAd}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" strokeWidth={2} />
                  {isSaving ? 'Spremanje...' : 'Spremi'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
