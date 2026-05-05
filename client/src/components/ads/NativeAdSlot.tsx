import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Edit2, Save, X } from 'lucide-react';
import { onImgError, PLACEHOLDER_CAR } from '../../lib/imageFallback';

interface NativeAdSlotProps {
  adId: string;
  defaultImage?: string;
  defaultHref?: string;
  isAdmin?: boolean;
}

export const NativeAdSlot = ({
  adId,
  defaultImage = PLACEHOLDER_CAR,
  defaultHref = '#',
  isAdmin = false,
}: NativeAdSlotProps) => {
  const [adImage, setAdImage] = useState(defaultImage);
  const [adHref, setAdHref] = useState(defaultHref);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editImage, setEditImage] = useState(adImage);
  const [editHref, setEditHref] = useState(adHref);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdminOverlay, setShowAdminOverlay] = useState(false);

  // Load ad data from Supabase
  useEffect(() => {
    const loadAd = async () => {
      try {
        const { data, error } = await supabase
          .from('ads')
          .select('image_url, href')
          .eq('id', adId)
          .single();

        if (error) throw error;
        if (data) {
          setAdImage(data.image_url || defaultImage);
          setAdHref(data.href || defaultHref);
          setEditImage(data.image_url || defaultImage);
          setEditHref(data.href || defaultHref);
        }
      } catch (error) {
        console.error('Failed to load ad:', error);
      }
    };

    loadAd();
  }, [adId, defaultImage, defaultHref]);

  const handleSaveAd = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ads')
        .update({
          image_url: editImage,
          href: editHref,
          updated_at: new Date().toISOString(),
        })
        .eq('id', adId);

      if (error) throw error;

      setAdImage(editImage);
      setAdHref(editHref);
      setIsEditMode(false);
      setShowAdminOverlay(false);
    } catch (error) {
      console.error('Failed to save ad:', error);
      alert('Failed to save ad');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditImage(adImage);
    setEditHref(adHref);
    setIsEditMode(false);
  };

  return (
    <div className="relative group">
      {/* Ad Container - Premium Styling */}
      <a
        href={adHref}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-[16/9] bg-card border-2 border-white/20 rounded-none overflow-hidden hover:border-white/40 transition-all duration-300 group-hover:shadow-2xl"
      >
        {/* Ad Image */}
        <img
          src={adImage}
          alt="Promoted content"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          onError={onImgError}
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Promoted Badge */}
        <div className="absolute top-4 left-4 px-2 py-1 bg-muted/50 backdrop-blur-sm border border-white/20 rounded-none">
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">
            Promoted
          </span>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Sadržaj partnera
          </p>
          <p className="text-sm font-black text-foreground line-clamp-2">
            Otkrij premium vozila
          </p>
        </div>
      </a>

      {/* Admin Overlay - Hidden by Default */}
      {isAdmin && (
        <>
          {/* Trigger Button */}
          <button
            onClick={() => setShowAdminOverlay(!showAdminOverlay)}
            className="absolute top-2 right-2 z-10 p-2 bg-black/80 border border-white/20 rounded-none hover:bg-black hover:border-white/40 transition-all opacity-0 group-hover:opacity-100"
          >
            <Edit2 className="w-4 h-4 text-white" strokeWidth={2} />
          </button>

          {/* Admin Panel */}
          {showAdminOverlay && (
            <div className="absolute inset-0 z-20 bg-black/95 border-2 border-white/20 rounded-none p-6 space-y-4 flex flex-col">
              {isEditMode ? (
                <>
                  {/* Edit Mode */}
                  <div className="space-y-4 flex-1 overflow-y-auto">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Image URL
                      </label>
                      <input
                        type="text"
                        value={editImage}
                        onChange={(e) => setEditImage(e.target.value)}
                        className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-all"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Link URL
                      </label>
                      <input
                        type="text"
                        value={editHref}
                        onChange={(e) => setEditHref(e.target.value)}
                        className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-all"
                        placeholder="https://example.com"
                      />
                    </div>

                    {/* Image Preview */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Preview
                      </label>
                      <div className="aspect-[16/9] bg-card border border-white/20 rounded-none overflow-hidden">
                        <img
                          src={editImage}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = defaultImage;
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-border">
                    <button
                      onClick={handleSaveAd}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-foreground/10 transition-all disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" strokeWidth={2} />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-muted text-foreground rounded-none font-black uppercase tracking-widest text-xs hover:bg-muted/70 transition-all"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* View Mode */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Current Image
                      </p>
                      <div className="aspect-[16/9] bg-card border border-white/20 rounded-none overflow-hidden">
                        <img
                          src={adImage}
                          alt="Current"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Current Link
                      </p>
                      <p className="text-xs text-foreground/80 break-all font-mono">
                        {adHref}
                      </p>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="w-full px-4 py-2 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-foreground/10 transition-all"
                  >
                    Edit Ad
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Helper component to inject ads into a grid of listings
 * Places an ad every 4 listings
 */
export const withAdSlots = <T extends { id: string }>(
  items: T[],
  adIds: string[]
) => {
  const result: (T | { type: 'ad'; adId: string })[] = [];
  let adIndex = 0;

  items.forEach((item, index) => {
    result.push(item);

    // Insert ad after every 4 items
    if ((index + 1) % 4 === 0 && adIndex < adIds.length) {
      result.push({
        type: 'ad',
        adId: adIds[adIndex],
      });
      adIndex++;
    }
  });

  return result;
};
