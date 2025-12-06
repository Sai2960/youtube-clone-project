// scripts/fixVideoUrls.js - Run this ONCE to fix all broken video URLs
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const videoSchema = new mongoose.Schema({}, { strict: false });
const Video = mongoose.model('videofiles', videoSchema);

async function fixAllVideoUrls() {
  try {
    console.log('🔧 Starting URL fix...\n');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    const BASE_URL = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`;
    
    // Get ALL videos
    const videos = await Video.find({});
    console.log(`📊 Found ${videos.length} total videos\n`);

    let fixed = 0;
    let skipped = 0;
    let failed = 0;

    for (const video of videos) {
      console.log(`\n🎬 Processing: ${video.videotitle || 'Untitled'}`);
      console.log(`   ID: ${video._id}`);
      
      // Get current URLs
      const currentUrls = {
        filepath: video.filepath,
        videofile: video.videofile,
        videoLink: video.videoLink,
        filename: video.videofilename
      };
      
      console.log(`   Current URLs:`, JSON.stringify(currentUrls, null, 2));

      // Check if already has valid Cloudinary URL
      const hasValidUrl = (url) => {
        return url && 
               url.includes('cloudinary.com') && 
               url.includes('/video/upload/') &&
               url.startsWith('https://') &&
               !url.includes(':5000') &&
               !url.includes('localhost');
      };

      if (hasValidUrl(video.filepath) && 
          hasValidUrl(video.videofile) && 
          hasValidUrl(video.videoLink)) {
        console.log(`   ✅ Already has valid URLs - SKIPPED`);
        skipped++;
        continue;
      }

      // Try to find ANY valid Cloudinary URL in any field
      let correctUrl = null;
      
      if (hasValidUrl(video.filepath)) correctUrl = video.filepath;
      else if (hasValidUrl(video.videofile)) correctUrl = video.videofile;
      else if (hasValidUrl(video.videoLink)) correctUrl = video.videoLink;

      // If found, use it
      if (correctUrl) {
        console.log(`   ✅ Found valid URL in one field: ${correctUrl}`);
        video.filepath = correctUrl;
        video.videofile = correctUrl;
        video.videoLink = correctUrl;
        await video.save();
        fixed++;
        console.log(`   ✅ FIXED by syncing existing URL`);
        continue;
      }

      // Try to reconstruct from filename
      if (video.videofilename) {
        let publicId = video.videofilename;
        
        // Clean up the filename
        publicId = publicId.replace(/^uploads\/videos\//, '');
        publicId = publicId.replace(/\.mp4$/, '');
        
        // Check if it's already a Cloudinary path
        if (publicId.includes('youtube-clone/videos/')) {
          correctUrl = `${BASE_URL}/${publicId}.mp4`;
        } else if (publicId.startsWith('file_')) {
          // Try to construct from file_ pattern
          correctUrl = `${BASE_URL}/youtube-clone/videos/${publicId}.mp4`;
        }

        if (correctUrl) {
          console.log(`   🔄 Reconstructed URL: ${correctUrl}`);
          video.filepath = correctUrl;
          video.videofile = correctUrl;
          video.videoLink = correctUrl;
          await video.save();
          fixed++;
          console.log(`   ✅ FIXED by reconstruction`);
          continue;
        }
      }

      // If we get here, we couldn't fix it
      console.log(`   ❌ FAILED - No valid URL found and cannot reconstruct`);
      console.log(`   ⚠️  This video needs to be RE-UPLOADED`);
      failed++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULTS:');
    console.log('='.repeat(60));
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`⏭️  Skipped (already correct): ${skipped}`);
    console.log(`❌ Failed (need re-upload): ${failed}`);
    console.log(`📊 Total processed: ${videos.length}`);
    
    if (failed > 0) {
      console.log('\n⚠️  WARNING: Some videos could not be fixed!');
      console.log('These videos have invalid/missing Cloudinary URLs and must be re-uploaded.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

fixAllVideoUrls();