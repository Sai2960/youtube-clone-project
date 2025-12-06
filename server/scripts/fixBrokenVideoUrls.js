// server/scripts/fixBrokenVideoUrls.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const videoSchema = new mongoose.Schema({}, { strict: false });
const Video = mongoose.model('videofiles', videoSchema);

async function fixBrokenVideoUrls() {
  try {
    console.log('🔧 Starting broken URL fix...\n');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    const BASE_URL = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`;
    
    const videos = await Video.find({
      $or: [
        { filepath: /file_[a-z0-9]+/i },
        { videofile: /file_[a-z0-9]+/i },
        { videoLink: /file_[a-z0-9]+/i }
      ]
    });

    console.log(`📊 Found ${videos.length} videos with broken URLs\n`);

    let fixed = 0;

    for (const video of videos) {
      console.log(`\n🎬 Processing: ${video.videotitle || 'Untitled'}`);
      console.log(`   ID: ${video._id}`);
      
      // Extract file ID from any field
      let fileId = null;
      const filepath = video.filepath || video.videofile || video.videoLink || '';
      const match = filepath.match(/file_[a-z0-9]+/i);
      
      if (match) {
        fileId = match[0];
        const correctUrl = `${BASE_URL}/youtube-clone/videos/${fileId}.mp4`;
        
        console.log(`   ✅ Found file ID: ${fileId}`);
        console.log(`   🔄 New URL: ${correctUrl}`);
        
        video.filepath = correctUrl;
        video.videofile = correctUrl;
        video.videoLink = correctUrl;
        await video.save();
        
        fixed++;
        console.log(`   ✅ FIXED`);
      } else {
        console.log(`   ❌ Could not extract file ID from: ${filepath}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Fixed ${fixed} videos`);
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

fixBrokenVideoUrls();