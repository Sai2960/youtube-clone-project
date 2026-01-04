// server/config/supabase.js - OPTIONAL SUPABASE CONFIG
import { createClient } from '@supabase/supabase-js';

// ✅ Make Supabase completely optional
let supabase = null;
let isConfigured = false;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    isConfigured = true;
    console.log('✅ Supabase configured:', supabaseUrl);
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error.message);
    console.warn('⚠️  Continuing without Supabase - using Cloudinary only');
  }
} else {
  console.warn('⚠️  Supabase not configured (SUPABASE_URL or SUPABASE_KEY missing)');
  console.warn('⚠️  Video storage will use Cloudinary only');
  console.warn('⚠️  To enable Supabase, add these to Railway variables:');
  console.warn('     - SUPABASE_URL=https://your-project.supabase.co');
  console.warn('     - SUPABASE_KEY=your_supabase_anon_key');
}

// ✅ Export null if not configured
export { supabase };

// ✅ Helper to check if Supabase is available
export const isSupabaseConfigured = () => isConfigured;

// ✅ Safe getter
export const getSupabaseClient = () => {
  if (!supabase) {
    console.warn('⚠️  Supabase not available - using Cloudinary fallback');
  }
  return supabase;
};

export default supabase;