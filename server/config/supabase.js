// server/config/supabase.js - COMPLETE SAFE VERSION
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Export function FIRST (before using it)
export const isSupabaseConfigured = () => {
  const configured = !!(
    process.env.SUPABASE_URL && 
    process.env.SUPABASE_KEY
  );
  
  if (!configured) {
    console.warn('⚠️ Supabase not configured - using Cloudinary fallback');
  }
  
  return configured;
};

export const bucketName = process.env.SUPABASE_BUCKET || 'youtube-videos';

// ✅ Lazy initialization (only create client when needed)
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
            persistSession: false, // Server-side only
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

// ✅ Safe proxy that never throws
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      console.warn(`⚠️ Supabase.${String(prop)} called but not configured`);
      // Return a function that returns a rejected promise
      return () => Promise.reject(new Error('Supabase not configured'));
    }
    return client[prop];
  }
});

export default supabase;