import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey));

let supabaseAdmin = null;
let supabaseClient = null;

if (isSupabaseConfigured) {
  // Privileged admin client for server-side auth administration and role management
  if (supabaseServiceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Standard client for public operations
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
 * Returns the privileged admin client (bypasses RLS, manages auth users)
 */
export const getSupabaseAdmin = () => {
  return supabaseAdmin;
};

/**
 * Returns the public client
 */
export const getSupabaseClient = () => {
  return supabaseClient || supabaseAdmin;
};
