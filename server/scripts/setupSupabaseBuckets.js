// server/scripts/setupSupabaseBuckets.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET_NAME = 'youtube-videos';

async function setupBucket() {
  console.log('Setting up Supabase storage bucket...\n');
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('Bucket Name:', BUCKET_NAME);
  console.log('\n');

  try {
    // Check if bucket exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      throw listError;
    }

    const exists = existingBuckets?.some(b => b.name === BUCKET_NAME);

    if (exists) {
      console.log(`✅ Bucket "${BUCKET_NAME}" already exists`);
      
      // Verify folders exist by trying to list them
      console.log('\nVerifying folder structure...');
      const folders = ['videos', 'thumbnails', 'avatars', 'banners'];
      
      for (const folder of folders) {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .list(folder, { limit: 1 });
        
        if (error) {
          console.log(`   ℹ️ Folder "${folder}" will be created on first upload`);
        } else {
          console.log(`   ✅ Folder "${folder}" verified`);
        }
      }
      
    } else {
      console.log(`📦 Creating bucket "${BUCKET_NAME}"...`);
      
      const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 524288000, // 500MB
        allowedMimeTypes: [
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/x-msvideo',
          'video/x-matroska',
          'video/webm',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp'
        ]
      });

      if (error) {
        console.error(`❌ Failed to create bucket:`, error);
        throw error;
      }

      console.log(`✅ Bucket "${BUCKET_NAME}" created successfully!`);
    }

    console.log('\n🎉 Bucket setup complete!');
    console.log('\n📝 Folder structure:');
    console.log('   - videos/       (for video files)');
    console.log('   - thumbnails/   (for video thumbnails)');
    console.log('   - avatars/      (for user profile pictures)');
    console.log('   - banners/      (for channel banners)');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupBucket();