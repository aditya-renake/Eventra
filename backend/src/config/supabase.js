/**
 * ==============================================================================
 * HackSeries 2026 — Supabase Client Configuration
 * ==============================================================================
 * Purpose:
 *   Initializes and exposes Supabase client singletons for backend operations.
 *   Provides two tiers of clients:
 *   1. Supabase Admin Client (`supabaseAdmin`):
 *      - Initialized with `SUPABASE_SERVICE_ROLE_KEY`.
 *      - Bypasses Postgres Row Level Security (RLS) policies.
 *      - Used by server-side repositories, auth administration, and background tasks.
 *   2. Supabase Standard Client (`supabaseClient`):
 *      - Initialized with `SUPABASE_ANON_KEY`.
 *      - Respects public Postgres RLS rules.
 *      - Used for unprivileged or client-scoped queries.
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

/**
 * Flag indicating whether Supabase is adequately configured to accept requests.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey));

let supabaseAdmin = null;
let supabaseClient = null;

if (isSupabaseConfigured) {
  // 1. Privileged admin client for server-side auth administration and role management
  if (supabaseServiceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // 2. Standard client for public operations
  if (supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });
  }

  console.log('✅ Supabase initialized successfully.');
} else {
  console.warn('⚠️ Supabase credentials missing or incomplete in .env.');
}

/**
 * Returns the privileged admin client.
 * Bypasses Row Level Security (RLS) and enables user management via GoTrue Admin API.
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const getSupabaseAdmin = () => {
  return supabaseAdmin;
};

/**
 * Returns the standard public client (or falls back to admin if anon key is not set).
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const getSupabaseClient = () => {
  return supabaseClient || supabaseAdmin;
};
