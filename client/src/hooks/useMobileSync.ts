import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface MobileUploadEvent {
  listingId: string;
  imageUrl: string;
  timestamp: string;
}

/**
 * Hook to listen for mobile uploads via Supabase Realtime
 * Watches for new images uploaded to the listing_images table
 */
export const useMobileSync = (listingId: string | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [lastUpload, setLastUpload] = useState<MobileUploadEvent | null>(null);

  useEffect(() => {
    if (!listingId) {
      setIsConnected(false);
      return;
    }

    setIsConnected(true);

    // Subscribe to listing_images table changes for this listing
    const subscription = supabase
      .channel(`listing_images:${listingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listing_images',
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          // New image uploaded
          if (payload.new && payload.new.url) {
            const imageUrl = payload.new.url;
            
            setNewImages((prev) => [...prev, imageUrl]);
            setLastUpload({
              listingId,
              imageUrl,
              timestamp: new Date().toISOString(),
            });

            // Auto-clear notification after 5 seconds
            setTimeout(() => {
              setNewImages((prev) => prev.filter((url) => url !== imageUrl));
            }, 5000);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [listingId]);

  return {
    isConnected,
    newImages,
    lastUpload,
  };
};

/**
 * Hook to fetch all images for a listing
 */
export const useListingImages = (listingId: string | null) => {
  const [images, setImages] = useState<Array<{ id: string; url: string; sort_order: number }>>([]);
  const [loading, setLoading] = useState(false);

  const fetchImages = useCallback(async () => {
    if (!listingId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('listing_images')
        .select('id, url, sort_order')
        .eq('listing_id', listingId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return {
    images,
    loading,
    refetch: fetchImages,
  };
};
