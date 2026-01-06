import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const bucketName = 'youtube-videos';

export const isSupabaseConfigured = () => {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

let supabaseInstance = null;

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase not configured');
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
      console.log('✅ Supabase initialized');
    } catch (error) {
      console.error('❌ Supabase init failed:', error.message);
      return null;
    }
  }

  return supabaseInstance;
};

export const supabase = new Proxy(
  {},
  {
    get(target, prop) {
      const client = getSupabaseClient();
      if (!client) {
        return () => Promise.reject(new Error('Supabase not configured'));
      }
      return client[prop];
    },
  }
);

export default supabase;