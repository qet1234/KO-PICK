import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';

import { createKoPickSupabaseClient } from '@/lib/supabase.shared';

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createKoPickSupabaseClient(secureStoreAdapter);
