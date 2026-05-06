import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function createStubClient(): SupabaseClient {
  const err = (op: string) =>
    Promise.resolve({
      data: null,
      error: {
        name: 'SupabaseEnvMissing',
        message: `Supabase env missing — ${op} disabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.`,
      },
    });
  const tableHandler: ProxyHandler<object> = {
    get: () => () => err('query'),
  };
  const stub: any = {
    from: () => new Proxy({}, tableHandler),
    rpc: () => err('rpc'),
    auth: {
      getSession: () => err('auth.getSession'),
      getUser: () => err('auth.getUser'),
      signInWithPassword: () => err('auth.signIn'),
      signUp: () => err('auth.signUp'),
      signOut: () => err('auth.signOut'),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    storage: { from: () => ({ upload: () => err('storage.upload'), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }), subscribe: () => ({ unsubscribe: () => {} }) }),
    removeChannel: () => {},
  };
  return stub as SupabaseClient;
}

export const supabase: SupabaseClient = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error(
        '[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — running in stub mode. Auth + listings will fail until env is set.'
      );
    }
    return createStubClient();
  }
  return createClient(supabaseUrl, supabaseAnonKey);
})();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
