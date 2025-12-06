import videofiles from '../Modals/video.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixThumbnails = async () => {
  try {
    console.log('🔧 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('✅ Connected! Fetching videos...');
    const videos = await videofiles.find({});
    
    console.log(`📹 Found ${videos.length} videos`);
    
    let fixed = 0;
    let alreadyHasThumbnail = 0;
    
    for (const video of videos) {
      // Check if already has thumbnail
      if (video.thumbnail || video.videothumbnail || video.thumbnailUrl) {
        alreadyHasThumbnail++;
        console.log(`✅ Video already has thumbnail: ${video.videotitle}`);
        continue;
      }
      
      // Get video URL
      const videoUrl = video.filepath || video.videofile || video.videoLink;
      
      if (!videoUrl) {
        console.log(`❌ Video has no URL: ${video.videotitle}`);
        continue;
      }
      
      // Check if it's a Cloudinary URL
      if (videoUrl.includes('cloudinary.com')) {
        // Generate thumbnail from video first frame
        const thumbnailUrl = videoUrl
          .replace('/video/upload/', '/video/upload/so_0,w_640,h_360,c_fill/')
          .replace('.mp4', '.jpg');
        
        // Update video
        video.thumbnail = thumbnailUrl;
        video.videothumbnail = thumbnailUrl;
        video.thumbnailUrl = thumbnailUrl;
        video.videothumb = thumbnailUrl;
        
        await video.save();
        
        fixed++;
        console.log(`✅ Fixed: ${video.videotitle}`);
        console.log(`   Thumbnail: ${thumbnailUrl.substring(0, 80)}`);
      } else {
        console.log(`⚠️ Non-Cloudinary video: ${video.videotitle}`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Total videos: ${videos.length}`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Already had thumbnails: ${alreadyHasThumbnail}`);
    console.log(`   Skipped: ${videos.length - fixed - alreadyHasThumbnail}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixThumbnails();