import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { appConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';

export function useSupabaseSessionRefresh() {
  useEffect(() => {
    if (!appConfig.isSupabaseConfigured || Platform.OS === 'web') return;

    supabase.auth.startAutoRefresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);
}
