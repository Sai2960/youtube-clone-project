import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupAllIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    const mongoUri = process.env.DB_URL;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Clean Likes Collection
    console.log('=== CLEANING LIKES COLLECTION ===');
    const likesCollection = db.collection('likes');
    
    // Drop ALL indexes except _id
    const likeIndexes = await likesCollection.indexes();
    console.log('Current indexes:', likeIndexes.map(i => i.name));
    
    for (const index of likeIndexes) {
      if (index.name !== '_id_') {
        try {
          await likesCollection.dropIndex(index.name);
          console.log(`✅ Dropped index: ${index.name}`);
        } catch (err) {
          console.log(`⚠️  Could not drop ${index.name}:`, err.message);
        }
      }
    }

    // Create only the correct index
    await likesCollection.createIndex(
      { viewer: 1, videoid: 1 }, 
      { unique: true, name: 'viewer_1_videoid_1' }
    );
    console.log('✅ Created viewer_1_videoid_1 index');

    // Clean History Collection
    console.log('\n=== CLEANING HISTORY COLLECTION ===');
    const historyCollection = db.collection('histories');
    
    const historyIndexes = await historyCollection.indexes();
    console.log('Current indexes:', historyIndexes.map(i => i.name));
    
    for (const index of historyIndexes) {
      if (index.name !== '_id_') {
        try {
          await historyCollection.dropIndex(index.name);
          console.log(`✅ Dropped index: ${index.name}`);
        } catch (err) {
          console.log(`⚠️  Could not drop ${index.name}:`, err.message);
        }
      }
    }

    // Create correct indexes for history
    await historyCollection.createIndex(
      { viewer: 1, videoid: 1 }, 
      { unique: true, name: 'viewer_1_videoid_1' }
    );
    await historyCollection.createIndex(
      { viewer: 1, createdAt: -1 }, 
      { name: 'viewer_1_createdAt_-1' }
    );
    console.log('✅ Created correct history indexes');

    // Verification
    console.log('\n=== FINAL STATE ===');
    const finalLikes = await likesCollection.indexes();
    console.log('Likes indexes:', finalLikes.map(i => i.name));
    
    const finalHistory = await historyCollection.indexes();
    console.log('History indexes:', finalHistory.map(i => i.name));

    console.log('\n✅ Cleanup complete! Restart your server.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupAllIndexes();