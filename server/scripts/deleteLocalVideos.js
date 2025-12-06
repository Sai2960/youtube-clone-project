import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const videoSchema = new mongoose.Schema({}, { strict: false });
const Video = mongoose.model('videofiles', videoSchema);

async function deleteLocalVideos() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');

    // Find videos with local paths and NO Cloudinary URL
    const videos = await Video.find({
      $and: [
        {
          $or: [
            { filepath: /^uploads\// },
            { filepath: /file_[a-z0-9]+\.mp4$/ }
          ]
        },
        {
          filepath: { $not: /cloudinary\.com/ }
        }
      ]
    });

    console.log(`\n🗑️ Found ${videos.length} videos with local-only paths`);

    if (videos.length === 0) {
      console.log('✅ No videos to delete!');
      process.exit(0);
    }

    console.log('\nVideos to delete:');
    videos.forEach(v => {
      console.log(`   - ${v.videotitle || v.title} (${v._id})`);
    });

    // Delete them
    const result = await Video.deleteMany({
      _id: { $in: videos.map(v => v._id) }
    });

    console.log(`\n✅ Deleted ${result.deletedCount} videos`);
    console.log('   Users will need to re-upload these videos');

    process.exit(0);
  } catch (error) {
    console.error('❌ Deletion failed:', error);
    process.exit(1);
  }
}

deleteLocalVideos();