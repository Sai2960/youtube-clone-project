import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Video from '../models/Video.js';
import User from '../models/User.js';

dotenv.config();

const BASE_URL = 'https://youtube-clone-project-q3pd.onrender.com';

const fixURL = (url) => {
  if (!url) return url;
  if (url.includes('res.cloudinary.com')) return url;
  if (url.includes('googleusercontent.com')) return url;
  
  // Fix local URLs
  if (url.includes('192.168.0.181') || url.includes('localhost')) {
    return url.replace(/https?:\/\/(192\.168\.0\.181|localhost):5000/, BASE_URL);
  }
  
  return url;
};

const migrateDatabase = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');

    // Fix videos
    const videos = await Video.find({});
    console.log(`📹 Found ${videos.length} videos to check`);

    let videoCount = 0;
    for (const video of videos) {
      let updated = false;
      const updates = {};

      if (video.videoLink) {
        const fixed = fixURL(video.videoLink);
        if (fixed !== video.videoLink) {
          updates.videoLink = fixed;
          updated = true;
        }
      }

      if (video.thumbnail) {
        const fixed = fixURL(video.thumbnail);
        if (fixed !== video.thumbnail) {
          updates.thumbnail = fixed;
          updated = true;
        }
      }

      if (video.channelAvatar) {
        const fixed = fixURL(video.channelAvatar);
        if (fixed !== video.channelAvatar) {
          updates.channelAvatar = fixed;
          updated = true;
        }
      }

      if (updated) {
        await Video.findByIdAndUpdate(video._id, updates);
        videoCount++;
        console.log(`✅ Fixed video: ${video.title}`);
      }
    }

    // Fix users
    const users = await User.find({});
    console.log(`👤 Found ${users.length} users to check`);

    let userCount = 0;
    for (const user of users) {
      if (user.avatar) {
        const fixed = fixURL(user.avatar);
        if (fixed !== user.avatar) {
          await User.findByIdAndUpdate(user._id, { avatar: fixed });
          userCount++;
          console.log(`✅ Fixed user: ${user.name}`);
        }
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Videos fixed: ${videoCount}`);
    console.log(`   Users fixed: ${userCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateDatabase();