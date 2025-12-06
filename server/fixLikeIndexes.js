import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixLikeIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('likes');

    // Get existing indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Drop old indexes
    try {
      await collection.dropIndex('userId_1_videoId_1');
      console.log('✅ Dropped old userId_1_videoId_1 index');
    } catch (err) {
      console.log('Index already removed or does not exist');
    }

    // Clear all documents (optional - only if you want fresh start)
    // await collection.deleteMany({});
    // console.log('✅ Cleared all like documents');

    // Create new indexes
    await collection.createIndex({ viewer: 1, videoid: 1 }, { unique: true });
    console.log('✅ Created new viewer_1_videoid_1 index');

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

fixLikeIndexes();