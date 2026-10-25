import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let clientInstance = null;

if (supabaseUrl && supabaseKey) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    console.log(`✅ Supabase Database Connected (${supabaseUrl}).`);
  } catch (err) {
    console.warn('⚠️ [Supabase] Initialization notice:', err.message);
  }
} else {
  console.log('ℹ️ Supabase credentials not yet detected in environment. Provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

/**
 * Convert snake_case DB row to camelCase JS object
 */
export function toCamel(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());
    out[camel] = v;
  }
  return out;
}

/**
 * Convert camelCase JS object to snake_case DB row
 */
export function toSnake(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    // Strip private/internal keys like _id
    if (k.startsWith('_')) {
      continue;
    }
    const snake = k.replace(/[A-Z]/g, (letter) => '_' + letter.toLowerCase());
    out[snake] = v;
  }
  return out;
}

export const getSupabase = () => clientInstance;

export const isSupabaseConfigured = () => Boolean(clientInstance);
