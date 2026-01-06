// server/scripts/migrate-cloudinary-to-supabase.js
import videofiles from '../Modals/video.js';
import { supabase, bucketName, isSupabaseConfigured } from '../config/supabase.js';
import cloudinary from '../config/cloudinary.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 5; // Process 5 videos at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay
const DRY_RUN = false; // Set to true to test without making changes

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const extractCloudinaryPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  try {
    const parts = url.split('/upload/');
    if (parts.length > 1) {
      const pathParts = parts[1].split('/');
      // Remove transformations (anything with commas or starting with v)
      const cleanParts = pathParts.filter(p => !p.includes(',') && !p.match(/^v\d+$/));
      const publicId = cleanParts.join('/').replace(/\.[^/.]+$/, '');
      return publicId;
    }
  } catch (error) {
    console.error('Error extracting public_id:', error);
  }
  return null;
};

const downloadFromCloudinary = async (cloudinaryUrl) => {
  try {
    console.log(`   📥 Downloading: ${cloudinaryUrl.substring(0, 60)}...`);
    
    const response = await axios({
      url: cloudinaryUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 120000, // 2 minutes
      maxContentLength: 500 * 1024 * 1024, // 500MB
    });

    console.log(`   ✅ Downloaded: ${(response.data.length / (1024 * 1024)).toFixed(2)}MB`);
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`   ❌ Download failed: ${error.message}`);
    throw error;
  }
};

const uploadToSupabase = async (buffer, filename, contentType) => {
  try {
    console.log(`   📤 Uploading to Supabase: ${filename}`);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filename, buffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);

    console.log(`   ✅ Uploaded: ${publicUrl}`);
    return { url: publicUrl, path: data.path };
  } catch (error) {
    console.error(`   ❌ Upload failed: ${error.message}`);
    throw error;
  }
};

const migrateVideo = async (video) => {
  try {
    console.log(`\n🎬 Migrating: ${video.videotitle}`);
    console.log(`   ID: ${video._id}`);

    // Extract Cloudinary URL
    const cloudinaryUrl = video.filepath || video.videofile || video.videoLink;
    
    if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) {
      console.log(`   ⚠️ No Cloudinary URL found, skipping`);
      return { success: false, reason: 'no_cloudinary_url' };
    }

    if (DRY_RUN) {
      console.log(`   🧪 DRY RUN - Would migrate: ${cloudinaryUrl.substring(0, 60)}...`);
      return { success: true, dryRun: true };
    }

    // Download from Cloudinary
    const videoBuffer = await downloadFromCloudinary(cloudinaryUrl);
    
    // Generate Supabase filename
    const timestamp = Date.now();
    const extension = cloudinaryUrl.match(/\.(mp4|mov|avi|webm)$/i)?.[1] || 'mp4';
    const supabaseFilename = `videos/${timestamp}-${video._id}.${extension}`;
    
    // Upload to Supabase
    const { url: supabaseUrl } = await uploadToSupabase(
      videoBuffer,
      supabaseFilename,
      'video/mp4'
    );

    // Update video document
    video.filepath = supabaseUrl;
    video.videofile = supabaseUrl;
    video.videoLink = supabaseUrl;
    video.videoUrl = supabaseUrl;
    video.storageType = 'supabase';
    video.migratedAt = new Date();
    video.oldCloudinaryUrl = cloudinaryUrl; // Keep for reference

    await video.save();

    console.log(`   ✅ Migration complete!`);
    return { success: true, url: supabaseUrl };

  } catch (error) {
    console.error(`   ❌ Migration failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const migrateThumbnail = async (video) => {
  try {
    const thumbnailUrl = video.thumbnail || video.videothumbnail;
    
    if (!thumbnailUrl || !thumbnailUrl.includes('cloudinary.com')) {
      console.log(`   ⚠️ No Cloudinary thumbnail found`);
      return { success: false, reason: 'no_thumbnail' };
    }

    if (DRY_RUN) {
      console.log(`   🧪 DRY RUN - Would migrate thumbnail`);
      return { success: true, dryRun: true };
    }

    console.log(`   📸 Migrating thumbnail...`);

    // Download thumbnail
    const thumbnailBuffer = await downloadFromCloudinary(thumbnailUrl);
    
    // Upload to Supabase
    const timestamp = Date.now();
    const extension = thumbnailUrl.match(/\.(jpg|jpeg|png|webp)$/i)?.[1] || 'jpg';
    const supabaseFilename = `thumbnails/${timestamp}-${video._id}.${extension}`;
    
    const { url: supabaseThumbnailUrl } = await uploadToSupabase(
      thumbnailBuffer,
      supabaseFilename,
      `image/${extension}`
    );

    // Update video document
    video.thumbnail = supabaseThumbnailUrl;
    video.videothumbnail = supabaseThumbnailUrl;
    video.thumbnailUrl = supabaseThumbnailUrl;
    video.oldCloudinaryThumbnail = thumbnailUrl;

    await video.save();

    console.log(`   ✅ Thumbnail migrated`);
    return { success: true, url: supabaseThumbnailUrl };

  } catch (error) {
    console.error(`   ❌ Thumbnail migration failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

const migrateAllVideos = async () => {
  console.log('\n🚀 ===== CLOUDINARY TO SUPABASE MIGRATION =====\n');
  console.log(`Mode: ${DRY_RUN ? '🧪 DRY RUN' : '🔴 LIVE'}`);
  console.log(`Batch Size: ${BATCH_SIZE}`);
  console.log(`Delay: ${DELAY_BETWEEN_BATCHES}ms\n`);

  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase not configured! Check your .env file.');
    process.exit(1);
  }

  try {
    // Find all videos with Cloudinary URLs
    const videos = await videofiles.find({
      $or: [
        { filepath: { $regex: 'cloudinary.com' } },
        { videofile: { $regex: 'cloudinary.com' } },
        { videoLink: { $regex: 'cloudinary.com' } },
      ]
    }).lean();

    console.log(`📊 Found ${videos.length} videos to migrate\n`);

    if (videos.length === 0) {
      console.log('✅ No videos to migrate!');
      return;
    }

    const results = {
      total: videos.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // Process in batches
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(videos.length / BATCH_SIZE)}`);
      console.log(`   Videos ${i + 1} to ${Math.min(i + BATCH_SIZE, videos.length)}\n`);

      for (const videoData of batch) {
        const video = await videofiles.findById(videoData._id);
        
        // Migrate video
        const videoResult = await migrateVideo(video);
        
        if (videoResult.success) {
          results.success++;
          
          // Migrate thumbnail if video migration succeeded
          await migrateThumbnail(video);
        } else if (videoResult.reason === 'no_cloudinary_url') {
          results.skipped++;
        } else {
          results.failed++;
          results.errors.push({
            videoId: video._id,
            title: video.videotitle,
            error: videoResult.error
          });
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < videos.length) {
        console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    // Print summary
    console.log('\n\n📊 ===== MIGRATION SUMMARY =====\n');
    console.log(`Total Videos: ${results.total}`);
    console.log(`✅ Successful: ${results.success}`);
    console.log(`⚠️ Skipped: ${results.skipped}`);
    console.log(`❌ Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Failed Videos:');
      results.errors.forEach(err => {
        console.log(`   - ${err.title} (${err.videoId}): ${err.error}`);
      });
    }

    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
};

// ============================================================================
// RUN MIGRATION
// ============================================================================

// Check if running as standalone script    
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAllVideos()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { migrateAllVideos, migrateVideo, migrateThumbnail };