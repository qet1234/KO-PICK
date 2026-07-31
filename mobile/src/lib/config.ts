const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
const naverMapClientId =
  process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() ?? '';

export const appConfig = {
  webUrl: process.env.EXPO_PUBLIC_WEB_URL?.trim() || 'https://koreapick.duckdns.org',
  supabaseUrl,
  supabasePublishableKey,
  naverMapClientId,
  isSupabaseConfigured: Boolean(supabaseUrl && supabasePublishableKey),
  isNaverMapConfigured: Boolean(naverMapClientId),
} as const;
