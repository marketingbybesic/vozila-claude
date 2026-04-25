import { supabase } from './supabase';
import { ListingStatus } from '../types';

/**
 * Update listing status with RLS protection
 * Only the owner (owner_id) can change the status
 */
export const updateListingStatus = async (
  listingId: string,
  newStatus: ListingStatus
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is the owner (RLS will enforce this server-side)
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('owner_id')
      .eq('id', listingId)
      .single();

    if (fetchError || !listing) {
      return { success: false, error: 'Listing not found' };
    }

    if (listing.owner_id !== user.id) {
      return { success: false, error: 'Unauthorized: You do not own this listing' };
    }

    // Update status
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .eq('owner_id', user.id); // RLS will enforce this

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('Failed to update listing status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update status',
    };
  }
};

/**
 * Get listing status for display
 * Works for both published and inactive listings
 */
export const getListingStatus = async (listingId: string): Promise<ListingStatus | null> => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('status')
      .eq('id', listingId)
      .single();

    if (error) throw error;
    return data?.status || null;
  } catch (error) {
    console.error('Failed to get listing status:', error);
    return null;
  }
};

/**
 * Supabase RLS Policy SQL
 * 
 * Run these commands in your Supabase SQL editor:
 * 
 * -- Enable RLS on listings table
 * ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
 * 
 * -- Policy: Users can view all published listings
 * CREATE POLICY "Users can view published listings"
 *   ON listings FOR SELECT
 *   USING (status = 'published' OR auth.uid() = owner_id);
 * 
 * -- Policy: Users can view their own listings (draft/inactive)
 * CREATE POLICY "Users can view own listings"
 *   ON listings FOR SELECT
 *   USING (auth.uid() = owner_id);
 * 
 * -- Policy: Only owner can update status
 * CREATE POLICY "Only owner can update status"
 *   ON listings FOR UPDATE
 *   USING (auth.uid() = owner_id)
 *   WITH CHECK (auth.uid() = owner_id);
 * 
 * -- Policy: Only owner can update listing
 * CREATE POLICY "Only owner can update listing"
 *   ON listings FOR UPDATE
 *   USING (auth.uid() = owner_id)
 *   WITH CHECK (auth.uid() = owner_id);
 * 
 * -- Policy: Only owner can delete listing
 * CREATE POLICY "Only owner can delete listing"
 *   ON listings FOR DELETE
 *   USING (auth.uid() = owner_id);
 * 
 * -- Policy: Users can insert their own listings
 * CREATE POLICY "Users can insert own listings"
 *   ON listings FOR INSERT
 *   WITH CHECK (auth.uid() = owner_id);
 */
