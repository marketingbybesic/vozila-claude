import { supabase } from './supabase';

/**
 * Track a lead inquiry and increment listing_leads_count
 */
export const trackLead = async (
  listingId: string,
  leadType: 'whatsapp' | 'message' | 'phone' | 'email'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
    }

    // Increment leads count via RPC
    const { error: rpcError } = await supabase.rpc('increment_listing_leads', {
      listing_id: listingId,
    });

    if (rpcError) {
      console.error('Failed to increment leads:', rpcError);
    }

    // Log lead for analytics
    const { error: logError } = await supabase
      .from('listing_leads')
      .insert({
        listing_id: listingId,
        user_id: user?.id || null,
        lead_type: leadType,
        created_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Failed to log lead:', logError);
    }

    return { success: true };
  } catch (error) {
    console.error('Lead tracking error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to track lead',
    };
  }
};

/**
 * Get lead count for a listing
 */
export const getLeadCount = async (listingId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('listing_leads_count')
      .eq('id', listingId)
      .single();

    if (error) throw error;
    return data?.listing_leads_count || 0;
  } catch (error) {
    console.error('Failed to get lead count:', error);
    return 0;
  }
};

/**
 * Get all leads for a listing (for dealer dashboard)
 */
export const getListingLeads = async (listingId: string) => {
  try {
    const { data, error } = await supabase
      .from('listing_leads')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get listing leads:', error);
    return [];
  }
};
