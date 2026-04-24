import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Nedostaju Supabase API ključevi u .env datoteci.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);