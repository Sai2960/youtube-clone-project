// server/scripts/setupSupabaseBuckets.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupBuckets() {
  const buckets = [
    { name: 'videos', public: true },
    { name: 'shorts', public: true },
    { name: 'thumbnails', public: true },
    { name: 'avatars', public: true }
  ];

  console.log('Setting up Supabase storage buckets...\n');

  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBuckets } = await supabase.storage.listBuckets();
      const exists = existingBuckets?.some(b => b.name === bucket.name);

      if (exists) {
        console.log(`✓ Bucket "${bucket.name}" already exists`);
      } else {
        // Create bucket
        const { data, error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: bucket.name === 'videos' || bucket.name === 'shorts' 
            ? 524288000  // 500MB for videos
            : 10485760   // 10MB for images
        });

        if (error) {
          console.error(`✗ Failed to create bucket "${bucket.name}":`, error.message);
        } else {
          console.log(`✓ Created bucket "${bucket.name}"`);
        }
      }
    } catch (error) {
      console.error(`Error with bucket "${bucket.name}":`, error.message);
    }
  }

  console.log('\n🎉 Bucket setup complete!');
}

setupBuckets();