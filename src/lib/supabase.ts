import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Supabase client for accounts, household sync and receipt reading.
 * The URL and publishable key are public by design; row level security protects the data.
 * When they aren't set (fresh clone, offline-only use) `supabase` is null and the app stays local.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key
  ? createClient(url, key, {
      auth: {
        // expo-sqlite's localStorage keeps the session across launches on device (web has its own).
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        // Email links and OAuth return a one-time code that the app exchanges for a session.
        flowType: 'pkce',
      },
    })
  : null;

export const cloudConfigured = supabase !== null;

// Only refresh tokens while the app is in the foreground (Supabase's React Native guidance).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
