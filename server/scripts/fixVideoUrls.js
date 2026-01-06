import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const videoSchema = new mongoose.Schema({}, { strict: false });
const Video = mongoose.model('videofiles', videoSchema);

async function fixVideoUrls() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');

    // Find all videos with local file paths
    const videos = await Video.find({
      $or: [
        { filepath: /^uploads\// },
        { filepath: /file_[a-z0-9]+\.mp4$/ },
        { videofile: /^uploads\// },
        { videoLink: /^uploads\// }
      ]
    });

    console.log(`\n📊 Found ${videos.length} videos with local paths`);

    if (videos.length === 0) {
      console.log('✅ No videos to fix!');
      process.exit(0);
    }

    let fixed = 0;
    let skipped = 0;

    for (const video of videos) {
      console.log(`\n🔍 Checking: ${video.videotitle || video.title}`);
      console.log(`   Current filepath: ${video.filepath}`);
      console.log(`   Current videofile: ${video.videofile}`);
      console.log(`   Current videoLink: ${video.videoLink}`);

      // Check if video has Cloudinary URL anywhere
      const cloudinaryUrl = 
        (video.filepath?.includes('cloudinary.com') && video.filepath) ||
        (video.videofile?.includes('cloudinary.com') && video.videofile) ||
        (video.videoLink?.includes('cloudinary.com') && video.videoLink);

      if (cloudinaryUrl) {
        console.log(`   ✅ Found Cloudinary URL: ${cloudinaryUrl.substring(0, 60)}...`);
        
        // Update all fields to use Cloudinary URL
        video.filepath = cloudinaryUrl;
        video.videofile = cloudinaryUrl;
        video.videoLink = cloudinaryUrl;
        
        await video.save();
        fixed++;
        console.log(`   ✅ Fixed!`);
      } else {
        console.log(`   ⚠️ No Cloudinary URL found - MANUAL FIX NEEDED`);
        console.log(`   Video ID: ${video._id}`);
        skipped++;
      }
    }

    console.log(`\n📊 Migration Complete:`);
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ⚠️ Skipped (no Cloudinary URL): ${skipped}`);
    
    if (skipped > 0) {
      console.log(`\n⚠️ WARNING: ${skipped} videos don't have Supabase URLs`);
      console.log(`   These videos need to be re-uploaded or manually fixed`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

fixVideoUrls();