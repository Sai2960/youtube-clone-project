// server/scripts/migrate-videos-to-supabase.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CRITICAL: Load environment variables FIRST, before any other imports
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Now import modules that depend on environment variables
import mongoose from 'mongoose';
import videofiles from '../Modals/video.js';
import { supabase, bucketName, isSupabaseConfigured } from '../config/supabase.js';
import fetch from 'node-fetch';
import cloudinary from 'cloudinary';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function migrateVideos() {
  console.log('\n🚀 ===== VIDEO MIGRATION TO SUPABASE =====');
  
  // Debug: Check if env vars are loaded
  console.log('🔍 Debug Info:');
  console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('   SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Set (length: ' + process.env.SUPABASE_KEY.length + ')' : '❌ Missing');
  console.log('   SUPABASE_BUCKET:', process.env.SUPABASE_BUCKET || 'youtube-videos (default)');
  console.log('   CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
  console.log('   CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('   CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');
  console.log('');
  
  // Validate Supabase config
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase is not configured!');
    console.error('   Please set SUPABASE_URL and SUPABASE_KEY in .env');
    console.error('   Current .env path:', path.join(__dirname, '..', '.env'));
    process.exit(1);
  }

  // Validate Cloudinary config
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary is not configured!');
    console.error('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
    process.exit(1);
  }

  console.log('✅ Supabase configured');
  console.log('✅ Cloudinary configured');
  console.log('📦 Bucket:', bucketName);

  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.DB_URL, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }

  // Find Cloudinary videos
  const videos = await videofiles.find({ 
    filepath: { $regex: 'cloudinary.com' },
    // ✅ Optional: Filter only videos without Supabase URL
    // filepath: { $not: { $regex: 'supabase.co' } }
  }).limit(10); // Start with 10 for testing

  console.log(`\n📊 Found ${videos.length} Cloudinary videos to migrate\n`);

  let migrated = 0;
  let failed = 0;

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    console.log(`\n[${i + 1}/${videos.length}] Processing: ${video.videotitle}`);
    console.log(`   Current URL: ${video.filepath.substring(0, 60)}...`);

    try {
      // ✅ STEP 1: Extract Cloudinary public_id from URL (skip transformation params)
      // URL format: https://res.cloudinary.com/CLOUD_NAME/video/upload/TRANSFORMATIONS/PATH/FILE.EXT
      const urlParts = video.filepath.split('/upload/');
      if (urlParts.length !== 2) {
        throw new Error('Invalid Cloudinary URL format');
      }
      
      // Get everything after /upload/
      const afterUpload = urlParts[1];
      
      // Remove file extension
      const withoutExt = afterUpload.replace(/\.(mp4|mov|avi|webm)$/i, '');
      
      // Split by / and find the part that starts with actual path (not transformations)
      // Transformations contain commas or colons, paths don't
      const parts = withoutExt.split('/');
      const pathParts = [];
      let foundPath = false;
      
      for (const part of parts) {
        // Skip transformation parameters (they contain commas, colons, or start with v followed by numbers)
        if (!foundPath && (part.includes(',') || part.includes(':') || /^v\d+$/.test(part))) {
          continue;
        }
        foundPath = true;
        pathParts.push(part);
      }
      
      const publicId = pathParts.join('/');
      console.log(`   📋 Public ID: ${publicId}`);

      // ✅ STEP 2: Use Cloudinary Admin API to get video details and download URL
      console.log('   📥 Fetching video from Cloudinary Admin API...');
      
      try {
        // Use Admin API to get resource details
        const resourceInfo = await new Promise((resolve, reject) => {
          cloudinary.v2.api.resource(publicId, {
            resource_type: 'video',
            type: 'upload'
          }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
        
        console.log('   ✅ Video found in Cloudinary');
        console.log(`   📊 Size: ${(resourceInfo.bytes / (1024 * 1024)).toFixed(2)}MB`);
        console.log(`   🔗 Secure URL: ${resourceInfo.secure_url.substring(0, 60)}...`);
        
        // Download using the secure_url from API response
        console.log('   📥 Downloading video...');
        const response = await fetch(resourceInfo.secure_url, { 
          timeout: 120000 // 2 minutes for large videos
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const buffer = Buffer.from(await response.arrayBuffer());
        const sizeInMB = (buffer.length / (1024 * 1024)).toFixed(2);
        console.log(`   ✅ Downloaded: ${sizeInMB}MB`);
        
      } catch (apiError) {
        // If Admin API fails, the video likely doesn't exist
        if (apiError.error && apiError.error.http_code === 404) {
          console.log('   ⚠️  Video does NOT exist in Cloudinary (404)');
          console.log('   ℹ️  Skipping - video was deleted from Cloudinary');
          failed++;
          continue;
        }
        throw apiError;
      }

      // ✅ STEP 3: Upload to Supabase
      console.log('   📤 Uploading to Supabase...');
      const fileName = `migrated/videos/${video._id}.mp4`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: 'video/mp4',
          cacheControl: '3600',
          upsert: false, // Don't overwrite if exists
        });

      if (uploadError) {
        // Check if file already exists
        if (uploadError.message.includes('already exists')) {
          console.log('   ℹ️  File already exists in Supabase, using existing');
        } else {
          throw uploadError;
        }
      } else {
        console.log('   ✅ Uploaded to Supabase');
      }

      // ✅ STEP 4: Get new public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log(`   🔗 New URL: ${publicUrl.substring(0, 60)}...`);

      // ✅ STEP 5: Update database (ALL video URL fields)
      video.filepath = publicUrl;
      video.videofile = publicUrl;
      video.videoLink = publicUrl;
      video.videoUrl = publicUrl;
      video.storageType = 'supabase'; // Track storage location

      await video.save();

      console.log('   ✅ Database updated');
      console.log(`   ✅ MIGRATED: ${video.videotitle}`);
      migrated++;

    } catch (error) {
      console.error(`   ❌ FAILED: ${video.videotitle}`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      failed++;
      
      // Continue to next video instead of stopping
      continue;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 MIGRATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`✅ Migrated: ${migrated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${videos.length}`);
  console.log('='.repeat(50) + '\n');

  await mongoose.disconnect();
  process.exit(0);
}

// Run migration
migrateVideos().catch((error) => {
  console.error('\n❌ Migration script error:', error);
  process.exit(1);
});