import type { SupportedStorage } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

import { appConfig } from '@/lib/config';

const fallbackUrl = 'http://127.0.0.1:54321';
const fallbackPublishableKey = 'mobile-development-placeholder';

export function createKoPickSupabaseClient(storage: SupportedStorage) {
  return createClient(
    appConfig.supabaseUrl || fallbackUrl,
    appConfig.supabasePublishableKey || fallbackPublishableKey,
    {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    },
  );
}
