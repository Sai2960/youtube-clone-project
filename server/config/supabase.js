// REPLACE entire file with this safer version:

import { createClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = () => {
  const configured = !!(
    process.env.SUPABASE_URL && 
    process.env.SUPABASE_KEY
  );
  
  if (!configured) {
    console.warn('⚠️ Supabase not configured - using Cloudinary only');
  }
  
  return configured;
};

export const bucketName = process.env.SUPABASE_BUCKET || 'youtube-videos';

// Lazy initialization
let supabaseInstance = null;

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY,
        {
          auth: {
            persistSession: false, // ✅ Server-side only
          },
        }
      );
      console.log('✅ Supabase initialized:', bucketName);
    } catch (error) {
      console.error('❌ Supabase init failed:', error.message);
      return null;
    }
  }

  return supabaseInstance;
};

// Safe proxy that returns null instead of throwing
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      console.warn(`⚠️ Supabase.${String(prop)} called but not configured`);
      return () => Promise.reject(new Error('Supabase not configured'));
    }
    return client[prop];
  }
});

export default supabase;