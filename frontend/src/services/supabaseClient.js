/**
 * ============================================================================
 * SUPABASE BROWSER CLIENT
 * ============================================================================
 * Purpose:
 *   Initializes the browser-side Supabase client using public credentials.
 *   Provides real-time event subscriptions, public bucket CDN asset retrieval,
 *   and client-level authentication state listeners.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kbwtlqpooqwqynsjmmqz.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
