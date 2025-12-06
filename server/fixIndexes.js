import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Try multiple possible env variable names
    const mongoUri = process.env.DB_URL || 
                     process.env.MONGODB_URI || 
                     process.env.MONGO_URI || 
                     process.env.DATABASE_URL ||
                     process.env.DB_URI;
    
    if (!mongoUri) {
      console.error('❌ MongoDB URI not found in environment variables');
      console.error('Please check your .env file for: MONGODB_URI, MONGO_URI, DATABASE_URL, or DB_URI');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Fix Likes Collection
    console.log('=== FIXING LIKES COLLECTION ===');
    const likesCollection = db.collection('likes');
    
    const likeIndexes = await likesCollection.indexes();
    console.log('Current indexes:', likeIndexes.map(i => i.name));

    // Drop old index
    try {
      await likesCollection.dropIndex('userId_1_videoId_1');
      console.log('✅ Dropped old userId_1_videoId_1 index');
    } catch (err) {
      console.log('ℹ️  Index userId_1_videoId_1 does not exist (already removed)');
    }

    // Clear invalid data
    const deleteResult = await likesCollection.deleteMany({
      $or: [
        { userId: null },
        { videoId: null },
        { viewer: null },
        { videoid: null }
      ]
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} invalid documents`);

    // Create new index
    await likesCollection.createIndex(
      { viewer: 1, videoid: 1 }, 
      { unique: true, name: 'viewer_1_videoid_1' }
    );
    console.log('✅ Created new viewer_1_videoid_1 index');

    // Fix History Collection
    console.log('\n=== FIXING HISTORY COLLECTION ===');
    const historyCollection = db.collection('histories');
    
    try {
      await historyCollection.dropIndex('userId_1_videoId_1');
      console.log('✅ Dropped old userId_1_videoId_1 index from history');
    } catch (err) {
      console.log('ℹ️  History index already fixed');
    }

    const historyDeleteResult = await historyCollection.deleteMany({
      $or: [
        { userId: null },
        { videoId: null },
        { viewer: null },
        { videoid: null }
      ]
    });
    console.log(`✅ Deleted ${historyDeleteResult.deletedCount} invalid history documents`);

    await historyCollection.createIndex(
      { viewer: 1, videoid: 1 }, 
      { unique: true, name: 'viewer_1_videoid_1' }
    );
    console.log('✅ Created new viewer_1_videoid_1 index for history');

    // Verify final state
    console.log('\n=== VERIFICATION ===');
    const finalLikeIndexes = await likesCollection.indexes();
    console.log('Likes indexes:', finalLikeIndexes.map(i => i.name));
    
    const finalHistoryIndexes = await historyCollection.indexes();
    console.log('History indexes:', finalHistoryIndexes.map(i => i.name));

    console.log('\n✅ Migration complete! Please restart your server.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

fixIndexes();