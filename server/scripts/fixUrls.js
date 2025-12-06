import mongoose from 'mongoose';
import dotenv from 'dotenv';
import videofiles from '../Modals/video.js';

dotenv.config();

mongoose.connect(process.env.DB_URL).then(async () => {
  console.log('Connected to DB');
  
  const videos = await videofiles.find({});
  let fixed = 0;

  for (const video of videos) {
    if (video.filepath && !video.filepath.includes('cloudinary.com')) {
      const fileMatch = video.filepath.match(/file_[a-z0-9]+/i);
      if (fileMatch) {
        const fileId = fileMatch[0];
        const url = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/youtube-clone/videos/${fileId}.mp4`;
        
        video.filepath = url;
        video.videofile = url;
        video.videoLink = url;
        await video.save();
        fixed++;
        console.log(`✅ Fixed: ${video.videotitle}`);
      }
    }
  }

  console.log(`\n✅ Fixed ${fixed} videos`);
  process.exit(0);
});