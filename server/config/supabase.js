// server/config/supabase.js - OPTIONAL SUPABASE CONFIG
import { createClient } from '@supabase/supabase-js';

// ✅ Helper to check if Supabase is available - NOW CHECKS DYNAMICALLY
export const isSupabaseConfigured = () => {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
};

// ✅ Get bucket name (with default)
export const bucketName = process.env.SUPABASE_BUCKET || 'youtube-videos';

// ✅ Lazy initialization - only create client when actually needed
let supabaseInstance = null;

// ✅ Get or create Supabase client
export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️  Supabase not available - using Cloudinary fallback');
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
      );
      console.log('✅ Supabase client initialized:', process.env.SUPABASE_URL);
      console.log('📦 Bucket:', bucketName);
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error.message);
      console.warn('⚠️  Continuing without Supabase - using Cloudinary only');
      return null;
    }
  }

  return supabaseInstance;
};

// ✅ Export supabase (lazy getter)
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_KEY.');
    }
    return client[prop];
  }
});

// ✅ Default export
export default supabase;

// ✅ Only show warnings if running as main app (not during migration scripts)
if (!process.argv.some(arg => arg.includes('migrate'))) {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️  Supabase not configured (SUPABASE_URL or SUPABASE_KEY missing)');
    console.warn('⚠️  Video storage will use Cloudinary only');
    console.warn('⚠️  To enable Supabase, add these to Railway variables:');
    console.warn('     - SUPABASE_URL=https://your-project.supabase.co');
    console.warn('     - SUPABASE_KEY=your_supabase_anon_key');
    console.warn('     - SUPABASE_BUCKET=youtube-videos (optional)');
  }
}