import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Edit2, Save, X, Play } from 'lucide-react';

interface NativeAdSlotProps {
  adId: string;
  userRole?: 'admin' | 'premium' | 'free' | null;
  isLoggedIn?: boolean;
}

interface AdData {
  id: string;
  image_url?: string;
  video_url?: string;
  html_content?: string;
  target_link: string;
  ad_type: 'image' | 'video' | 'html';
  is_dealership: boolean;
}

export const NativeAdSlot = ({ adId, userRole, isLoggedIn = false }: NativeAdSlotProps) => {
  const [ad, setAd] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdminOverlay, setShowAdminOverlay] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<AdData>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = userRole === 'admin';
  const isPremium = userRole === 'premium';

  // Chameleon Logic: Determine if ad should be shown
  const shouldShowAd = () => {
    if (!ad) return false;

    // Logged out users see all ads
    if (!isLoggedIn) return true;

    // Premium users see only dealership promotions
    if (isPremium) return ad.is_dealership;

    // Free users see all ads
    return true;
  };

  // Load ad data
  useEffect(() => {
    const loadAd = async () => {
      try {
        const { data, error } = await supabase
          .from('ads')
          .select('*')
          .eq('id', adId)
          .single();

        if (error) throw error;
        setAd(data as AdData);
        setEditData(data);
      } catch (error) {
        console.error('Failed to load ad:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAd();
  }, [adId]);

  const handleSaveAd = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ads')
        .update({
          image_url: editData.image_url,
          video_url: editData.video_url,
          html_content: editData.html_content,
          target_link: editData.target_link,
          updated_at: new Date().toISOString(),
        })
        .eq('id', adId);

      if (error) throw error;

      setAd(editData as AdData);
      setIsEditMode(false);
      setShowAdminOverlay(false);
    } catch (error) {
      console.error('Failed to save ad:', error);
      alert('Failed to save ad');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !ad || !shouldShowAd()) {
    return null;
  }

  return (
    <div className="relative group">
      {/* Ad Container - Indistinguishable from listing cards */}
      <a
        href={ad.target_link}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-[16/9] bg-neutral-900 border border-white/10 rounded-none overflow-hidden hover:border-white/30 transition-all duration-300 group-hover:shadow-2xl"
      >
        {/* Image Ad */}
        {ad.ad_type === 'image' && ad.image_url && (
          <img
            src={ad.image_url}
            alt="Promoted"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        )}

        {/* Video Ad */}
        {ad.ad_type === 'video' && ad.video_url && (
          <div className="relative w-full h-full bg-black">
            <video
              src={ad.video_url}
              className="w-full h-full object-cover"
              muted
              loop
              autoPlay
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-all">
              <Play className="w-12 h-12 text-white/40" strokeWidth={1.5} />
            </div>
          </div>
        )}

        {/* HTML Ad */}
        {ad.ad_type === 'html' && ad.html_content && (
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: ad.html_content }}
          />
        )}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* PROMOTED Tag - Tiny, Unobtrusive */}
        <div className="absolute top-4 left-4 px-1.5 py-0.5 bg-white/5 backdrop-blur-sm border border-white/20 rounded-none">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
            Promoted
          </span>
        </div>
      </a>

      {/* Admin Edit Button - Hidden by default */}
      {isAdmin && (
        <>
          <button
            onClick={() => setShowAdminOverlay(!showAdminOverlay)}
            className="absolute top-2 right-2 z-10 p-2 bg-black/80 border border-white/20 rounded-none hover:bg-black hover:border-white/40 transition-all opacity-0 group-hover:opacity-100"
          >
            <Edit2 className="w-4 h-4 text-white" strokeWidth={2} />
          </button>

          {/* Admin Control Panel */}
          {showAdminOverlay && (
            <div className="absolute inset-0 z-20 bg-black/95 border border-white/20 rounded-none p-6 space-y-4 flex flex-col overflow-y-auto">
              {isEditMode ? (
                <>
                  {/* Edit Mode */}
                  <div className="space-y-4 flex-1">
                    {/* Ad Type */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                        Ad Type
                      </label>
                      <select
                        value={editData.ad_type || 'image'}
                        onChange={(e) =>
                          setEditData({ ...editData, ad_type: e.target.value as 'image' | 'video' | 'html' })
                        }
                        className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white focus:outline-none focus:border-white/40"
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="html">HTML</option>
                      </select>
                    </div>

                    {/* Image URL */}
                    {editData.ad_type === 'image' && (
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                          Image URL
                        </label>
                        <input
                          type="text"
                          value={editData.image_url || ''}
                          onChange={(e) => setEditData({ ...editData, image_url: e.target.value })}
                          className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/40"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    )}

                    {/* Video URL */}
                    {editData.ad_type === 'video' && (
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                          Video URL
                        </label>
                        <input
                          type="text"
                          value={editData.video_url || ''}
                          onChange={(e) => setEditData({ ...editData, video_url: e.target.value })}
                          className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/40"
                          placeholder="https://example.com/video.mp4"
                        />
                      </div>
                    )}

                    {/* HTML Content */}
                    {editData.ad_type === 'html' && (
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                          HTML Content
                        </label>
                        <textarea
                          value={editData.html_content || ''}
                          onChange={(e) => setEditData({ ...editData, html_content: e.target.value })}
                          className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/40 h-24 resize-none"
                          placeholder="<div>Custom HTML</div>"
                        />
                      </div>
                    )}

                    {/* Target Link */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                        Target Link
                      </label>
                      <input
                        type="text"
                        value={editData.target_link || ''}
                        onChange={(e) => setEditData({ ...editData, target_link: e.target.value })}
                        className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/40"
                        placeholder="https://example.com"
                      />
                    </div>

                    {/* Dealership Toggle */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={editData.is_dealership || false}
                        onChange={(e) => setEditData({ ...editData, is_dealership: e.target.checked })}
                        className="w-4 h-4 border border-white/20 rounded-none cursor-pointer accent-white"
                      />
                      <label className="text-xs font-black uppercase tracking-widest text-white/60 cursor-pointer">
                        Dealership Promotion
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-white/10">
                    <button
                      onClick={handleSaveAd}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" strokeWidth={2} />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditData(ad);
                        setIsEditMode(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-700 transition-all"
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
                      <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                        Ad Type
                      </p>
                      <p className="text-xs text-white/80 capitalize">{ad.ad_type}</p>
                    </div>

                    {ad.ad_type === 'image' && ad.image_url && (
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                          Preview
                        </p>
                        <img
                          src={ad.image_url}
                          alt="Preview"
                          className="w-full aspect-[16/9] object-cover border border-white/20 rounded-none"
                        />
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                        Target Link
                      </p>
                      <p className="text-xs text-white/80 break-all font-mono">{ad.target_link}</p>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                        Type
                      </p>
                      <p className="text-xs text-white/80">
                        {ad.is_dealership ? 'Dealership Promotion' : 'Regular Ad'}
                      </p>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="w-full px-4 py-2 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all"
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
 * Helper to inject ads into listing grid
 * Places an ad every 4 items, respecting chameleon logic
 */
export const withAdSlots = <T extends { id: string }>(
  items: T[],
  adIds: string[],
  userRole?: 'admin' | 'premium' | 'free' | null,
  isLoggedIn?: boolean
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
